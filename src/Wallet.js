var assert = require('assert')

var _ = require('lodash')
var Q = require('q')
var bitcoin = require('bitcoinjs-lib')
var cclib = require('coloredcoinjs-lib')

var address = require('./address')
var asset = require('./asset')
var blockchain = require('./blockchain')
var coin = require('./coin')
var tx = require('./tx')


/**
 * @callback Wallet~errorCallback
 * @param {?Error} error
 */

/**
 * @class Wallet
 *
 * @param {Object} opts
 * @param {(Buffer|string)} opts.masterKey Seed for hierarchical deterministic wallet
 * @param {boolean} [opts.testnet=false]
 * @param {string} [opts.blockchain='BlockrIo'] Now available only BlockrIo
 */
function Wallet(opts) {
  opts = _.extend({
    testnet: false,
    blockchain: 'BlockrIo'
  }, opts)

  this.network = opts.testnet ? bitcoin.networks.testnet : bitcoin.networks.bitcoin


  this.blockchain = new blockchain[opts.blockchain]({ testnet: opts.testnet })

  this.cdStorage = new cclib.ColorDefinitionStorage()
  this.cdManager = new cclib.ColorDefinitionManager(this.cdStorage)

  this.cDataStorage = new cclib.ColorDataStorage()
  this.cData = new cclib.ColorData(this.cDataStorage, this.blockchain)

  this.aStorage = new address.AddressStorage()
  this.aManager = new address.AddressManager(this.aStorage)
  this.aManager.setMasterKeyFromSeed(opts.masterKey, this.network)

  this.adStorage = new asset.AssetDefinitionStorage()
  this.adManager = new asset.AssetDefinitionManager(this.cdManager, this.adStorage)
  this.adManager.getAllAssets().forEach(this.getSomeAddress.bind(this))

  this.coinStorage = new coin.CoinStorage()
  this.coinManager = new coin.CoinManager(this, this.coinStorage)

  this.txStorage = new tx.TxStorage()
  this.txDb = new tx.NaiveTxDb(this.txStorage, this.coinManager, this.blockchain)
  this.txFetcher = new tx.TxFetcher(this.txDb, this.blockchain)

  this.txTransformer = new tx.TxTransformer()
}

Wallet.prototype.getNetwork = function() { return this.network }

Wallet.prototype.getBlockchain = function() { return this.blockchain }

Wallet.prototype.getColorDefinitionManager = function() { return this.cdManager }

Wallet.prototype.getColorData = function() { return this.cData }

Wallet.prototype.getAddressManager = function() { return this.adManager }

Wallet.prototype.getCoinManager = function() { return this.coinManager }

Wallet.prototype.getTxDb = function() { return this.txDb }

Wallet.prototype.getTxFetcher = function() { return this.txFetcher }

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
 * Param asColorAddress in address method not good solution
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
 * @param {AssetDefinition} assetdef
 * @param {string} address
 * @return {string}
 */
Wallet.prototype.getBitcoinAddress = function (assetdef, address) {
  /** Check colorId, except bitcoin */
  var colordefs = assetdef.getColorSet().getColorDefinitions()
  var isBitcoinAsset = colordefs.length === 1 && colordefs[0].getColorType() === 'uncolored'
  if (!isBitcoinAsset) {
    if (assetdef.getId() !== address.split('@')[0])
      return null
    return address.split('@')[1]
  }

  return address
}

/**
 * @param {AssetDefinition} assetdef
 * @param {string} address
 * @return {boolean}
 */
Wallet.prototype.checkAddress = function(assetdef, address) {
  address = this.getBitcoinAddress(assetdef, address)
  if (address === null)
    return false

  /** Check bitcoin address */
  try {
    var isValid = bitcoin.Address.fromBase58Check(address).version === this.network.pubKeyHash
    return isValid

  } catch (e) {
    return false

  }
}

/**
 * @param {Wallet~errorCallback} cb
 */
Wallet.prototype.scanAllAddresses = function(cb) {
  var self = this

  var assetdefs = self.getAllAssetDefinitions()
  var addresses = _.flatten(
    assetdefs.map(function(assetdef) { return self.getAllAddresses(assetdef) }))

  this.getTxFetcher().scanAddressesUnspent(addresses, cb)
}

/**
 * @param {Wallet~errorCallback} cb
 */
Wallet.prototype.fullScanAllAddresses = function(cb) {
  var self = this

  var assetdefs = self.getAllAssetDefinitions()
  var addresses = _.flatten(
    assetdefs.map(function(assetdef) { return self.getAllAddresses(assetdef) }))

  this.getTxFetcher().fullScanAddresses(addresses, cb)
}

/**
 * Return new CoinQuery for request confirmed/unconfirmed coins, balance ...
 *
 * @return {CoinQuery}
 */
Wallet.prototype.getCoinQuery = function() {
  return new coin.CoinQuery(this)
}

/**
 * @param {AssetDefinition} assetdef
 * @param {Object} opts
 * @param {boolean} [opts.onlyConfirmed=false]
 * @param {boolean} [opts.onlyUnconfirmed=false]
 * @param {function} cb
 */
Wallet.prototype._getBalance = function(assetdef, opts, cb) {
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

    return cclib.ColorValue.sum(colorValues).getValue()

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
  this.cdStorage.clear()
  this.cDataStorage.clear()
  this.aStorage.clear()
  this.adStorage.clear()
  this.coinStorage.clear()
  this.txStorage.clear()
}


module.exports = Wallet
