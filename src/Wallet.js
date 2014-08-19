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
  var network = data.testnet ? bitcoin.networks.testnet : bitcoin.networks.bitcoin
  this.aManager.setMasterKeyFromSeed(data.masterKey, network)

  this.blockchain = new cclib.blockchain.BlockrIOAPI({ testnet: data.testnet })

  this.cDataStorage = new cclib.storage.ColorDataStorage()
  this.cData = new cclib.color.ColorData(this.cDataStorage, this.blockchain)

  this.cdStorage = new cclib.storage.ColorDefinitionStorage()
  this.cdManager = new cclib.color.ColorDefinitionManager(this.cdStorage)

  this.adStorage = new storage.AssetDefinitionStorage()
  this.adManager = new asset.AssetDefinitionManager(this.cdManager, this.adStorage)

  this.adManager.getAllAssets().forEach(function(assetdef) {
    this.getSomeAddress(assetdef)
  }.bind(this))

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
 * Create new address for given asset
 *
 * @param {AssetDefinition} assetdef
 * @return {string}
 * @throws {Error} If masterKey not defined
 */
Wallet.prototype.getNewAddress = function(assetdef) {
  return this.aManager.getNewAddress(assetdef).getAddress()
}

/**
 * Return first address for given asset or create if not exist
 *
 * @param {AssetDefinition} assetdef
 * @return {string}
 * @throws {Error} If masterKey not defined
 */
Wallet.prototype.getSomeAddress = function(assetdef) {
  return this.aManager.getSomeAddress(assetdef).getAddress()
}

/**
 * Return all addresses for given asset
 *
 * @param {AssetDefinition} assetdef
 * @return {string[]}
 * @throws {Error} If masterKey not defined
 */
Wallet.prototype.getAllAddresses = function(assetdef) {
  var addresses = this.aManager.getAllAddresses(assetdef)
  return addresses.map(function(address) { return address.getAddress() })
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

  var coinQuery = this.getCoinQuery()
  coinQuery = coinQuery.onlyColoredAs(assetdef.getColorSet().getColorDefinitions())
  coinQuery = coinQuery.onlyAddresses(this.getAllAddresses(assetdef))

  if (opts.onlyConfirmed)
    coinQuery = coinQuery.getConfirmed()
  if (opts.onlyUnconfirmed)
    coinQuery = coinQuery.getUnconfirmed()

  coinQuery.getCoins(function(error, coinList) {
    if (error !== null) {
      cb(error)
      return
    }

    coinList.getTotalValue(function(error, colorValues) {
      if (error !== null) {
        cb(error)
        return
      }

      var balance = 0
      if (colorValues.length === 1)
        balance = colorValues[0].getValue()
      // When supported more than one colorDefinition in one AssetDefinition
      //if (colorValues.length > 1)
      //  balance = colorValues.reduce(function(cv1, cv2) { return cv1.getValue() + cv2.getValue() })

      cb(null, balance)
    })
  })
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

  }).then(function(txId) {
    cb(null, txId)

  }).fail(function(error) {
    cb(error)

  }).done()
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
