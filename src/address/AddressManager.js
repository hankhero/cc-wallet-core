var assert = require('assert')

var _ = require('lodash')
var LRU = require('lru-cache')
var bitcoin = require('bitcoinjs-lib')
var ECPubKey = bitcoin.ECPubKey
var HDNode = bitcoin.HDNode
var networks = Object.keys(bitcoin.networks).map(function(key) { return bitcoin.networks[key] })

var Address = require('./Address')
var storage = require('../storage')


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


/**
 * @class AddressManager
 *
 * @param {storage.AddressStore} amStorage
 */
function AddressManager(amStorage) {
  assert(amStorage instanceof storage.AddressStorage, 'Expected AddressStore amStorage, got ' + amStorage)

  this.amStorage = amStorage

  this.UNCOLORED_CHAIN = 0
  this.EPOBC_CHAIN = 826130763

  this.privKeyCache = LRU()
}

/**
 * Set masterKey from seed and drop all created addresses
 *
 * @param {Buffer|string} seed Buffer or hex string
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

  this.amStorage.setMasterKey(masterKey)
}

/**
 * Get masterKey from storage in base58 format or undefined if not exists
 *
 * @return {string|undefined} masterKey in base58 format
 */
AddressManager.prototype.getMasterKey = function() {
  return this.amStorage.getMasterKey()
}

/**
 * Get new address and save it to db
 *
 * @param {Object} params
 * @param {number} params.account
 * @param {number} params.chain
 * @return {Address}
 */
AddressManager.prototype.getNewAddress = function(params) {
  assert(_.isObject(params), 'Expected Object params, got ' + params)
  assert(_.isNumber(params.account), 'Expected number params.account, got ' + params.account)
  assert(_.isNumber(params.chain), 'Expected number params.chain, got ' + params.chain)

  var masterKey = this.getMasterKey()
  if (_.isUndefined(masterKey))
    throw new Error('set masterKey first')

  var maxIndex = this.amStorage.getMaxIndex({ account: params.account, chain: params.chain })
  var newIndex = _.isUndefined(maxIndex) ? 0 : maxIndex + 1

  var newNode = derive(HDNode.fromBase58(masterKey), params.account, params.chain, newIndex)

  this.amStorage.addPubKey({
    account: params.account,
    chain: params.chain,
    index: newIndex,
    pubKey: newNode.pubKey.toHex()
  })

  var newAddress = new Address({
    pubKey: newNode.pubKey,
    network: newNode.network
  })

  return newAddress
}

/**
 * Get first address if exists else create and return it
 *
 * @param {Object} params
 * @param {number} params.account
 * @param {number} params.chain
 * @return {Address}
 */
AddressManager.prototype.getSomeAddress = function(params) {
  assert(_.isObject(params), 'Expected Object params, got ' + params)
  assert(_.isNumber(params.account), 'Expected number params.account, got ' + params.account)
  assert(_.isNumber(params.chain), 'Expected number params.chain, got ' + params.chain)

  var addresses = this.getAllAddresses(params)

  if (addresses.length === 0)
    addresses = [this.getNewAddress(params)]

  return addresses[0]
}

/**
 * Get all addresses
 *
 * @param {Object} params
 * @param {number} params.account
 * @param {number} params.chain
 * @return {Array}
 */
AddressManager.prototype.getAllAddresses = function(params) {
  assert(_.isObject(params), 'Expected Object params, got ' + params)
  assert(_.isNumber(params.account), 'Expected number params.account, got ' + params.account)
  assert(_.isNumber(params.chain), 'Expected number params.chain, got ' + params.chain)

  var masterKey = this.getMasterKey()
  if (_.isUndefined(masterKey))
    throw new Error('set masterKey first')

  var network = HDNode.fromBase58(masterKey).network

  function record2address(record) {
    return new Address({ pubKey: ECPubKey.fromHex(record.pubKey), network: network })
  }

  return this.amStorage.getAllPubKeys({ account: params.account, chain: params.chain }).map(record2address)
}

/**
 * @param {string} address
 * @return {bitcoinjs-lib.ECKey}
 * @throws {Error} If address not found
 */
AddressManager.prototype.getPrivKeyByAddress = function(address) {
  var privKey = this.privKeyCache.get(address)
  if (!_.isUndefined(privKey))
    return privKey

  var masterKey = this.getMasterKey()

  var network = HDNode.fromBase58(masterKey).network

  var record = this.amStorage.getAllPubKeys().filter(function(record) {
    var recordAddress = new Address({ pubKey: ECPubKey.fromHex(record.pubKey), network: network })
    return recordAddress.getAddress() === address
  })

  if (record.length === 0)
    throw new Error('address not found')

  var node = derive(HDNode.fromBase58(masterKey), record[0].account, record[0].chain, record[0].index)
  return node.privKey
}


module.exports = AddressManager
