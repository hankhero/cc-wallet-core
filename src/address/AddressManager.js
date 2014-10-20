var assert = require('assert')

var bitcoin = require('coloredcoinjs-lib').bitcoin
var ECPubKey = bitcoin.ECPubKey
var HDNode = bitcoin.HDNode
var networks = Object.keys(bitcoin.networks).map(function(key) { return bitcoin.networks[key] })
var cclib = require('coloredcoinjs-lib')
var _ = require('lodash')

var Address = require('./Address')
var AssetDefinition = require('../asset').AssetDefinition

var UNCOLORED_CHAIN = 0
var EPOBC_CHAIN = 826130763


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
 * @param {(function|ColorDefinition|AssetDefinition)} definition
 * @return {number}
 * @throws {Error} If multi-color asset or unknown definition type
 */
function selectChain(definition) {
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
 * @class AddressManager
 *
 * @param {storage.AddressStorage} storage
 * @param {Object} network Network description from bitcoinjs-lib.networks
 */
function AddressManager(storage, network) {
  assert(networks.indexOf(network) !== -1, 'Unknow network type, got ' + network)

  this.storage = storage
  this.network = network
}

/**
 * @param {(Buffer|string)} seed
 * @return {bitcoinjs-lib.HDNode}
 */
AddressManager.prototype.HDNodeFromSeed = function(seed) {
  if (!Buffer.isBuffer(seed))
    seed = new Buffer(seed, 'hex')

  return HDNode.fromSeedBuffer(seed, this.network)
}

/**
 * @param {(Buffer|string)} seed
 * @return {boolean}
 */
AddressManager.prototype.isCurrentSeed = function(seed) {
  var oldZeroPubKeys = _.sortBy(this.storage.getAll(UNCOLORED_CHAIN), 'index')
  if (oldZeroPubKeys.length === 0)
    return this.storage.getAll().length === 0

  var rootNode = this.HDNodeFromSeed(seed)
  var newZeroPubKey = derive(rootNode, 0, UNCOLORED_CHAIN, 0).pubKey.toHex()

  return oldZeroPubKeys[0].pubKey === newZeroPubKey
}

/**
 * @param {(Buffer|string)} seed
 * @throws {Error} If not currently seed
 */
AddressManager.prototype.isCurrentSeedCheck = function(seed) {
  if (!this.isCurrentSeed(seed))
    throw new Error('Given seed is not currently used')
}

/**
 * Get new address and save it to db
 *
 * @param {(function|ColorDefinition|AssetDefinition)} definition
 * @param {(Buffer|string)} seed
 * @return {Address}
 * @throws {Error} If not currently seed or unknow chain
 */
AddressManager.prototype.getNewAddress = function(definition, seed) {
  this.isCurrentSeedCheck(seed)

  var chain = selectChain(definition)

  var newIndex = 0
  this.storage.getAll(chain).forEach(function(record) {
    if (record.index >= newIndex)
      newIndex = record.index + 1
  })

  var rootNode = this.HDNodeFromSeed(seed)
  var pubKey = derive(rootNode, 0, chain, newIndex).pubKey

  var record = this.storage.add({
    chain: chain,
    index: newIndex,
    pubKey: pubKey.toHex()
  })

  var assetDefinition
  if (definition instanceof AssetDefinition)
    assetDefinition = definition

  return new Address(this, record, this.network, assetDefinition)
}

/**
 * Get all addresses
 *
 * @param {(function|ColorDefinition|AssetDefinition)} definition
 * @return {Address[]}
 * @throws {Error} If unknow chain
 */
AddressManager.prototype.getAllAddresses = function(definition) {
  var chain = selectChain(definition)

  var assetDefinition
  if (definition instanceof AssetDefinition)
    assetDefinition = definition

  var addresses = this.storage.getAll(chain).map(function(record) {
    return new Address(this, record, this.network, assetDefinition)
  }.bind(this))

  return addresses
}

/**
 * @param {string} address
 * @return {?bitcoinjs-lib.ECPubKey}
 */
AddressManager.prototype.getPubKeyByAddress = function(address) {
  var records = this.storage.getAll().filter(function(record) {
    var recordAddress = new Address(this, record, this.network).getAddress()
    return recordAddress === address
  }.bind(this))

  if (records.length === 0)
    return null

  return ECPubKey.fromHex(records[0].pubKey)
}

/**
 * @param {string} address
 * @param {(Buffer|string)} seed
 * @return {?bitcoinjs-lib.ECKey}
 */
AddressManager.prototype.getPrivKeyByAddress = function(address, seed) {
  this.isCurrentSeedCheck(seed)

  var records = this.storage.getAll().filter(function(record) {
    var recordAddress = new Address(this, record, this.network).getAddress()
    return recordAddress === address
  }.bind(this))

  if (records.length === 0)
    return null

  var rootNode = this.HDNodeFromSeed(seed)
  var node = derive(rootNode, records[0].account, records[0].chain, records[0].index)
  return node.privKey
}


module.exports = AddressManager
