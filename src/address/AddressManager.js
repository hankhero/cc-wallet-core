var assert = require('assert')

var _ = require('lodash')
var LRU = require('lru-cache')
var bitcoin = require('bitcoinjs-lib')
var ECPubKey = bitcoin.ECPubKey
var HDNode = bitcoin.HDNode
var networks = Object.keys(bitcoin.networks).map(function(key) { return bitcoin.networks[key] })

var Address = require('./Address')
var AssetDefinition = require('../asset').AssetDefinition


function isHexString(s) {
  var set = ['0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f']

  return (_.isString(s) &&
          s.length % 2 === 0 &&
          s.toLowerCase().split('').every(function(x) { return set.indexOf(x) !== -1 }))
}

/**
 * @param {bitcoinjs-lib.HDNode} rootNode
 * @param {number} account
 * @param {number} chain
 * @param {number} index
 * @return {bitcoinjs-lib.HDNode}
 */
function derive(rootNode, account, chain, index) {
  assert(rootNode instanceof HDNode, 'Expected bitcoinjs-lib.HDNode rootNode, got ' + rootNode)
  assert(_.isNumber(account), 'Expected number account, got ' + account)
  assert(_.isNumber(chain), 'Expected number chain, got ' + chain)
  assert(_.isNumber(index), 'Expected number index, got ' + index)

  var node = rootNode
  var path = account + '\'/' + chain + '\'/' + index

  path.split('/').forEach(function(value) {
    var usePrivate = (value.length > 1) && (value[value.length - 1] === '\'')
    var childIndex = parseInt(usePrivate ? value.slice(0, value.length - 1) : value) & 0x7fffffff

    if (usePrivate)
      childIndex += 0x80000000

    node = node.derive(childIndex)
  })

  return node
}


var UNCOLORED_CHAIN = 0
var EPOBC_CHAIN = 826130763

/**
 * @class AddressManager
 *
 * @param {storage.AddressStorage} storage
 */
function AddressManager(storage) {
  this.storage = storage

  this.privKeyCache = LRU()
}

/**
 * Set masterKey from seed and drop all created addresses
 *
 * @param {(Buffer|string)} seed Buffer or hex string
 * @param {Object} network Network description from bitcoinjs-lib.networks
 */
AddressManager.prototype.setMasterKeyFromSeed = function(seed, network) {
  assert(Buffer.isBuffer(seed) || isHexString(seed), 'Expected Buffer or hex string seed, got ' + seed)
  assert(networks.indexOf(network) !== -1, 'Unknow network type, got ' + network)

  var node

  if (Buffer.isBuffer(seed))
    node = HDNode.fromSeedBuffer(seed, network)
  else
    node = HDNode.fromSeedHex(seed, network)

  this.setMasterKey(node.toBase58())
}

/**
 * Set masterKey and drop all created addresses
 *
 * @param {string} masterKey String in base58 format
 */
AddressManager.prototype.setMasterKey = function(masterKey) {
  HDNode.fromBase58(masterKey) // Check masterKey

  this.storage.setMasterKey(masterKey)
  this.privKeyCache.reset()
}

/**
 * Get masterKey from storage in base58 format
 *
 * @return {?string} masterKey in base58 format
 * @throws {Error} If masterKey not defined
 */
AddressManager.prototype.getMasterKey = function() {
  var masterKey = this.storage.getMasterKey()
  if (masterKey === null)
    throw new Error('call setMasterKey first')

  return masterKey
}

/**
 * @param {(ColorDefinition|AssetDefinition)} definition
 * @return {number}
 * @throws {Error} If multi-color asset or unknown definition type
 */
AddressManager.prototype.selectChain = function(definition) {
  var colordef = definition

  if (colordef instanceof AssetDefinition) {
    var colordefs = colordef.getColorSet().getColorDefinitions()
    if (colordefs.length !== 1)
      throw new Error('Currently only single-color assets are supported')

    colordef = colordefs[0]
  }

  switch (colordef.getColorType()) {
    case 'uncolored':
      return UNCOLORED_CHAIN

    case 'epobc':
      return EPOBC_CHAIN

    default:
      throw new Error('Unknow ColorDefinition')
  }
}

/**
 * Get new address and save it to db
 *
 * @param {(ColorDefinition|AssetDefinition)} definition
 * @return {Address}
 * @throws {Error} If masterKey not defined
 */
AddressManager.prototype.getNewAddress = function(definition) {
  var chain = this.selectChain(definition)

  var newIndex = 0
  this.storage.getPubKeys(chain).forEach(function(record) {
    if (record.index >= newIndex)
      newIndex = record.index + 1
  })

  var masterKey = this.getMasterKey()
  var newNode = derive(HDNode.fromBase58(masterKey), 0, chain, newIndex)

  this.storage.addPubKey({
    chain: chain,
    index: newIndex,
    pubKey: newNode.pubKey.toHex()
  })

  var newAddress = new Address(newNode.pubKey, newNode.network)

  return newAddress
}

/**
 * Get first address if exists else create and return it
 *
 * @param {(ColorDefinition|AssetDefinition)} definition
 * @return {Address[]}
 * @throws {Error} If masterKey not defined
 */
AddressManager.prototype.getSomeAddress = function(definition) {
  var addresses = this.getAllAddresses(definition)

  if (addresses.length === 0)
    addresses = [this.getNewAddress(definition)]

  return addresses[0]
}

/**
 * Get all addresses
 *
 * @param {(ColorDefinition|AssetDefinition)} [definition]
 * @return {Address[]}
 * @throws {Error} If masterKey not defined
 */
AddressManager.prototype.getAllAddresses = function(definition) {
  var network = HDNode.fromBase58(this.getMasterKey()).network

  function record2address(record) {
    return new Address(ECPubKey.fromHex(record.pubKey), network)
  }

  var chain
  if (!_.isUndefined(definition))
    chain = this.selectChain(definition)

  var pubKeys = this.storage.getPubKeys(chain).map(record2address)

  return pubKeys
}

/**
 * @param {string} address
 * @return {bitcoinjs-lib.ECKey}
 * @throws {Error} If address not found or masterKey not defined
 */
AddressManager.prototype.getPrivKeyByAddress = function(address) {
  var privKey = this.privKeyCache.get(address)
  if (!_.isUndefined(privKey))
    return privKey

  var masterKey = this.getMasterKey()
  var network = HDNode.fromBase58(masterKey).network

  var record = this.storage.getPubKeys().filter(function(record) {
    var recordAddress = new Address(ECPubKey.fromHex(record.pubKey), network)
    return recordAddress.getAddress() === address
  })

  if (record.length === 0)
    throw new Error('address not found')

  var node = derive(HDNode.fromBase58(masterKey), record[0].account, record[0].chain, record[0].index)
  this.privKeyCache.set(address, node.privKey)

  return node.privKey
}


module.exports = AddressManager
