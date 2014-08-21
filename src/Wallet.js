var assert = require('assert')

var _ = require('lodash')
var Q = require('q')
var bitcoin = require('bitcoinjs-lib')
var cclib = require('coloredcoinjs-lib')

var AddressManager = require('./address').AddressManager
var asset = require('./asset')
var tx = require('./tx')
var storage = require('./storage')


/**
 * @class Wallet
 *
 * @param {Object} data
 * @param {Buffer|string} data.masterKey Seed for hierarchical deterministic wallet
 * @param {boolean} [data.testnet=false]
 */
function Wallet(data) {
  assert(_.isObject(data), 'Expected Object data, got ' + data)
  assert(Buffer.isBuffer(data.masterKey) || _.isString(data.masterKey),
    'Expected Buffer|string data.masterKey, got ' + data.masterKey)
  data.testnet = _.isUndefined(data.testnet) ? false : data.testnet
  assert(_.isBoolean(data.testnet), 'Expected boolean data.testnet, got ' + data.testnet)


  this.aStorage = new storage.AddressStorage()
  this.aManager = new AddressManager(this.aStorage)
  this.network = data.testnet ? bitcoin.networks.testnet : bitcoin.networks.bitcoin
  this.aManager.setMasterKeyFromSeed(data.masterKey, this.network)

  this.blockchain = new cclib.blockchain.BlockrIOAPI({ testnet: data.testnet })

  this.cDataStorage = new cclib.storage.ColorDataStorage()
  this.cData = new cclib.color.ColorData(this.cDataStorage, this.blockchain)

  this.cdStorage = new cclib.storage.ColorDefinitionStorage()
  this.cdManager = new cclib.color.ColorDefinitionManager(this.cdStorage)

  this.adStorage = new storage.AssetDefinitionStorage()
  this.adManager = new asset.AssetDefinitionManager(this.cdManager, this.adStorage)
  this.adManager.getAllAssets().forEach(this.getSomeAddress.bind(this))

  this.txTransformer = new tx.TxTransformer()
}

/**
 * @param {Object} data
 * @param {string[]} data.monikers
 * @param {string[]} data.colorSchemes
 * @param {number} [data.unit=1]
 * @return {AssetDefinition}
 * @throws {Error} If asset already exists
 */
Wallet.prototype.addAssetDefinition = function(data) {
  var assetdef = this.adManager.createAssetDefinition(data)
  this.getSomeAddress(assetdef)
  return assetdef
}

/**
 * @param {string} moniker
 * @return {?AssetDefinition}
 */
Wallet.prototype.getAssetDefinitionByMoniker = function(moniker) {
  return this.adManager.getByMoniker(moniker)
}

/**
 * @return {AssetDefinition[]}
 */
Wallet.prototype.getAllAssetDefinitions = function() {
  return this.adManager.getAllAssets()
}

/**
 * Param asColor in address method not good solution
 * But sometimes we need bitcoin address for ColorDefintion,
 *  such as in OperationalTx.getChangeAddress
 */

/**
 * Create new address for given asset
 *
 * @param {AssetDefinition} assetdef
 * @param {boolean} [asColorAddress=false]
 * @return {string}
 * @throws {Error} If masterKey not defined
 */
Wallet.prototype.getNewAddress = function(assetdef, asColorAddress) {
  var address = this.aManager.getNewAddress(assetdef).getAddress()

  if (asColorAddress === true)
    address = assetdef.getId() + '@' + address

  return address
}

/**
 * Return first address for given asset or create if not exist
 *
 * @param {AssetDefinition} assetdef
 * @param {boolean} [asColorAddress=false]
 * @return {string}
 * @throws {Error} If masterKey not defined
 */
Wallet.prototype.getSomeAddress = function(assetdef, asColorAddress) {
  var address = this.aManager.getSomeAddress(assetdef).getAddress()

  if (asColorAddress === true)
    address = assetdef.getId() + '@' + address

  return address
}

/**
 * Return all addresses for given asset
 *
 * @param {AssetDefinition} assetdef
 * @param {boolean} [asColorAddress=false]
 * @return {string[]}
 * @throws {Error} If masterKey not defined
 */
Wallet.prototype.getAllAddresses = function(assetdef, asColorAddress) {
  var addresses = this.aManager.getAllAddresses(assetdef)
  addresses = addresses.map(function(address) { return address.getAddress() })

  if (asColorAddress === true) {
    var assetId = assetdef.getId()
    addresses = addresses.map(function(address) { return assetId + '@' + address })
  }

  return addresses
}

/**
 * @param {string} address
 * @return {boolean}
 */
Wallet.prototype.checkAddress = function(assetdef, address) {
  var isValid = true

  /** Check colorId, except bitcoin */
  var colordefs = assetdef.getColorSet().getColorDefinitions()
  var isBitcoinAsset = colordefs.length === 1 && colordefs[0].getColorType() === 'uncolored'
  if (!isBitcoinAsset) {
    isValid = isValid && assetdef.getId() === address.split('@')[0]
    address = address.split('@')[1]
  }

  /** Check bitcoin address */
  try {
    address = bitcoin.Address.fromBase58Check(address)
    isValid = isValid && address.version === this.network.pubKeyHash
  } catch (e) {
    isValid = false
  }

  return isValid
}

/**
 * Return new CoinQuery for request confirmed/unconfirmed coins, balance ...
 *
 * @return {CoinQuery}
 */
Wallet.prototype.getCoinQuery = function() {
  var addresses = this.aManager.getAllAddresses()
  addresses = addresses.map(function(address) { return address.getAddress() })

  return new cclib.coin.CoinQuery({
    addresses: addresses,
    blockchain: this.blockchain,
    colorData: this.cData,
    colorDefinitionManager: this.cdManager
  })
}

/**
 * @param {AssetDefinition} assetdef
 * @param {Object} opts
 * @param {boolean} [opts.onlyConfirmed=false]
 * @param {boolean} [opts.onlyUnconfirmed=false]
 * @param {function} cb
 */
Wallet.prototype._getBalance = function(assetdef, opts, cb) {
  assert(assetdef instanceof asset.AssetDefinition,
    'Expected AssetDefinition assetdef, got ' + assetdef)
  assert(_.isObject(opts), 'Expected Object opts, got ' + opts)
  opts = _.extend({
    onlyConfirmed: false,
    onlyUnconfirmed: false
  }, opts)
  assert(_.isBoolean(opts.onlyConfirmed), 'Expected boolean opts.onlyConfirmed, got ' + opts.onlyConfirmed)
  assert(_.isBoolean(opts.onlyUnconfirmed), 'Expected boolean opts.onlyUnconfirmed, got ' + opts.onlyUnconfirmed)
  assert(!opts.onlyConfirmed || !opts.onlyUnconfirmed, 'opts.onlyConfirmed and opts.onlyUnconfirmed both is true')
  assert(_.isFunction(cb), 'Expected function cb, got ' + cb)

  var self = this

  Q.fcall(function() {
    var coinQuery = self.getCoinQuery()
    coinQuery = coinQuery.onlyColoredAs(assetdef.getColorSet().getColorDefinitions())
    coinQuery = coinQuery.onlyAddresses(self.getAllAddresses(assetdef))

    if (opts.onlyConfirmed)
      coinQuery = coinQuery.getConfirmed()
    if (opts.onlyUnconfirmed)
      coinQuery = coinQuery.getUnconfirmed()

    return Q.ninvoke(coinQuery, 'getCoins')

  }).then(function(coinList) {
    return Q.ninvoke(coinList, 'getTotalValue')

  }).then(function(colorValues) {
    if (colorValues.length === 0)
      return 0

    return cclib.color.ColorValue.sum(colorValues).getValue()

  }).done(function(balance) { cb(null, balance) }, function(error) { cb(error) })
}

/**
 * @param {AssetDefinition} assetdef
 * @param {function} cb
 */
Wallet.prototype.getAvailableBalance = function(assetdef, cb) {
  this._getBalance(assetdef, { 'onlyConfirmed': true }, cb)
}

/**
 * @param {AssetDefinition} assetdef
 * @param {function} cb
 */
Wallet.prototype.getTotalBalance = function(assetdef, cb) {
  this._getBalance(assetdef, {}, cb)
}

/**
 * @param {AssetDefinition} assetdef
 * @param {function} cb
 */
Wallet.prototype.getUnconfirmedBalance = function(assetdef, cb) {
  this._getBalance(assetdef, { 'onlyUnconfirmed': true }, cb)
}

/**
 * @typedef {Object} rawTarget
 * @property {string} address Target address
 * @property {number} value Target value in satoshi
 */

/**
 * @callback Wallet~sendCoins
 * @param {?Error} error
 * @param {string} txId
 */

/**
 * @param {AssetDefinition} assetdef
 * @param {rawTarget[]} rawTargets
 * @param {Wallet~sendCoins} cb
 */
Wallet.prototype.sendCoins = function(assetdef, rawTargets, cb) {
  var self = this

  Q.fcall(function() {
    var assetTargets = rawTargets.map(function(target) {
      var assetValue = new asset.AssetValue(assetdef, target.value)
      return new asset.AssetTarget(target.address, assetValue)
    })

    var assetTx = new tx.AssetTx(self)
    assetTx.addTargets(assetTargets)

    return Q.ninvoke(self.txTransformer, 'transformTx', assetTx, 'signed')

  }).then(function(signedTx) {
    return Q.ninvoke(self.blockchain, 'sendTx', signedTx)

  }).done(function(txId) { cb(null, txId) }, function(error) { cb(error) })
}

/**
 * Drop all data from storage's
 */
Wallet.prototype.clearStorage = function() {
  this.aStorage.clear()
  this.cDataStorage.clear()
  this.cdStorage.clear()
  this.adStorage.clear()
}


module.exports = Wallet
