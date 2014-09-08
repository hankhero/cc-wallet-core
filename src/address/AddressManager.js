var assert = require('assert')

var bitcoin = require('bitcoinjs-lib')
var ECPubKey = bitcoin.ECPubKey
var HDNode = bitcoin.HDNode
var networks = Object.keys(bitcoin.networks).map(function(key) { return bitcoin.networks[key] })
var cclib = require('coloredcoinjs-lib')
var _ = require('lodash')
var LRU = require('lru-cache')

var Address = require('./Address')
var AssetDefinition = require('../asset').AssetDefinition


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
 * @param {Object} network Network description from bitcoinjs-lib.networks
 */
function AddressManager(storage, network) {
  assert(networks.indexOf(network) !== -1, 'Unknow network type, got ' + network)

  this.storage = storage
  this.network = network
  this.masterKey = null

  this.privKeyCache = LRU()
}

/**
 * @param {(Buffer|string)} seed Buffer or hex string
 */
AddressManager.prototype.setMasterKeyFromSeed = function(seed) {
  if (!Buffer.isBuffer(seed))
    seed = new Buffer(seed, 'hex')

  var masterKey = HDNode.fromSeedBuffer(seed, this.network).toBase58()
  this.setMasterKey(masterKey)
}

/**
 * @param {string} masterKey String in base58 format
 * @throws {AssertionError} If AddressManager.network not equal masterKey network
 */
AddressManager.prototype.setMasterKey = function(masterKey) {
  if (this.masterKey === masterKey)
    return

  var rootNode = HDNode.fromBase58(masterKey)
  assert.deepEqual(rootNode.network, this.network, 'masterKey network not equal manager network')

  var oldZeroPubKey = this.storage.get(UNCOLORED_CHAIN).filter(function(record) { return record.index === 0 })[0]
  var newZeroPubKey = derive(rootNode, 0, UNCOLORED_CHAIN, 0).pubKey.toHex()
  if (oldZeroPubKey !== newZeroPubKey)
    this.storage.clear()

  this.masterKey = masterKey
  this.privKeyCache.reset()
}

/**
 * @return {?string} masterKey in base58 format
 * @throws {Error} If masterKey not installed
 */
AddressManager.prototype.getMasterKey = function() {
  if (this.masterKey === null)
    throw new Error('masterKey is not installed')

  return this.masterKey
}

/**
 */
AddressManager.prototype.dropMasterKey = function() {
  this.masterKey = null
}

/**
 * @param {(function|ColorDefinition|AssetDefinition)} definition
 * @return {number}
 * @throws {Error} If multi-color asset or unknown definition type
 */
AddressManager.prototype.selectChain = function(definition) {
  if (definition instanceof AssetDefinition) {
    var colordefs = definition.getColorSet().getColorDefinitions()
    if (colordefs.length !== 1)
      throw new Error('Currently only single-color assets are supported')

    definition = colordefs[0]
  }

  if (definition instanceof cclib.ColorDefinition)
    definition = definition.constructor

  switch (definition) {
    case cclib.UncoloredColorDefinition:
      return UNCOLORED_CHAIN

    case cclib.EPOBCColorDefinition:
      return EPOBC_CHAIN

    default:
      throw new Error('Unknow ColorDefinition')
  }
}

/**
 * Get new address and save it to db
 *
 * @param {(function|ColorDefinition|AssetDefinition)} definition
 * @return {Address}
 * @throws {Error} If masterKey not installed
 */
AddressManager.prototype.getNewAddress = function(definition) {
  var chain = this.selectChain(definition)

  var newIndex = 0
  this.storage.get(chain).forEach(function(record) {
    if (record.index >= newIndex)
      newIndex = record.index + 1
  })

  var pubKey = derive(HDNode.fromBase58(this.getMasterKey()), 0, chain, newIndex).pubKey

  this.storage.add({
    chain: chain,
    index: newIndex,
    pubKey: pubKey.toHex()
  })

  return new Address(pubKey, this.network)
}

/**
 * Get first address if exists or create new and return it
 *
 * @param {(function|ColorDefinition|AssetDefinition)} definition
 * @return {Address[]}
 * @throws {Error} If masterKey not installed
 */
AddressManager.prototype.getSomeAddress = function(definition) {
  var addresses = this.getAllAddresses(definition)
  if (addresses.length > 0)
    return addresses[0]
  
  return this.getNewAddress(definition)
}

/**
 * Get all addresses
 *
 * @param {(function|ColorDefinition|AssetDefinition)} [definition]
 * @return {Address[]}
 * @throws {Error} If masterKey not installed
 */
AddressManager.prototype.getAllAddresses = function(definition) {
  var chain
  if (!_.isUndefined(definition))
    chain = this.selectChain(definition)

  function record2address(record) {
    return new Address(ECPubKey.fromHex(record.pubKey), this.network)
  }

  var pubKeys = this.storage.get(chain).map(record2address.bind(this))
  return pubKeys
}

/**
 * @param {string} address
 * @return {bitcoinjs-lib.ECKey}
 * @throws {Error} If address not found or masterKey not installed
 */
AddressManager.prototype.getPrivKeyByAddress = function(address) {
  var privKey = this.privKeyCache.get(address)
  if (!_.isUndefined(privKey))
    return privKey

  var record = this.storage.getAll().filter(function(record) {
    var recordAddress = new Address(ECPubKey.fromHex(record.pubKey), this.network)
    return recordAddress.getAddress() === address
  }.bind(this))

  if (record.length === 0)
    throw new Error('address not found')

  var node = derive(HDNode.fromBase58(this.getMasterKey()), record[0].account, record[0].chain, record[0].index)
  this.privKeyCache.set(address, node.privKey)

  return node.privKey
}


module.exports = AddressManager
