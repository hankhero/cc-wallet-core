var _ = require('lodash')
var Q = require('q')
var bitcoin = require('bitcoinjs-lib')
var cclib = require('coloredcoinjs-lib')

var address = require('./address')
var asset = require('./asset')
var blockchain = require('./blockchain')
var coin = require('./coin')
var ConfigStorage = require('./ConfigStorage')
var history = require('./history')
var tx = require('./tx')


/**
 * @callback Wallet~errorCallback
 * @param {?Error} error
 */

/**
 * @class Wallet
 *
 * @param {Object} opts
 * @param {boolean} [opts.testnet=false]
 * @param {string} [opts.blockchain='BlockrIo'] Now available only BlockrIo
 */
function Wallet(opts) {
  opts = _.extend({
    testnet: false,
    blockchain: 'BlockrIo'
  }, opts)

  this.network = opts.testnet ? bitcoin.networks.testnet : bitcoin.networks.bitcoin

  this.config = new ConfigStorage()

  this.blockchain = new blockchain[opts.blockchain]({ testnet: opts.testnet })

  this.cdStorage = new cclib.ColorDefinitionStorage()
  this.cdManager = new cclib.ColorDefinitionManager(this.cdStorage)

  this.cDataStorage = new cclib.ColorDataStorage()
  this.cData = new cclib.ColorData(this.cDataStorage, this.blockchain)

  this.aStorage = new address.AddressStorage()
  this.aManager = new address.AddressManager(this.aStorage, this.network)

  this.adStorage = new asset.AssetDefinitionStorage()
  this.adManager = new asset.AssetDefinitionManager(this.cdManager, this.adStorage)
  if (opts.systemAssetDefinitions)
      opts.systemAssetDefinitions.forEach(function (sad) {
          this.adManager.createAssetDefinition(sad);
      }.bind(this));

  this.coinStorage = new coin.CoinStorage()
  this.coinManager = new coin.CoinManager(this, this.coinStorage)

  this.historyManager = new history.HistoryManager(this)

  this.txStorage = new tx.TxStorage()
  this.txDb = new tx.NaiveTxDb(this, this.txStorage)
  this.blockchain.txDb = this.txDb // not good, but else sendCoins with addUnconfirmedTx not working
  this.txFetcher = new tx.TxFetcher(this.txDb, this.blockchain)
}

Wallet.prototype.getNetwork = function() { return this.network }
Wallet.prototype.getBlockchain = function() { return this.blockchain }
Wallet.prototype.getColorDefinitionManager = function() { return this.cdManager }
Wallet.prototype.getColorData = function() { return this.cData }
Wallet.prototype.getAddressManager = function() { return this.aManager }
Wallet.prototype.getAssetDefinitionManager = function() { return this.adManager }
Wallet.prototype.getCoinManager = function() { return this.coinManager }
Wallet.prototype.getCoinQuery = function() { return new coin.CoinQuery(this) }
Wallet.prototype.getHistoryManager = function() { return this.historyManager }
Wallet.prototype.getTxDb = function() { return this.txDb }
Wallet.prototype.getTxFetcher = function() { return this.txFetcher }

/**
 * @return {boolean}
 */
Wallet.prototype.isInitialized = function() {
  return this.config.get('initialized') || false
}

/**
 * @throws {Error} If not initialized
 */
Wallet.prototype.isInitializedCheck = function() {
  if (!this.isInitialized())
    throw new Error('Wallet not initialized')
}

/**
 * @param {(Buffer|string)} seed
 * @throws {Error} If already initialized
 */
Wallet.prototype.initialize = function(seed) {
  if (this.isInitialized())
    throw new Error('Wallet already initialized')

  var addressManager = this.getAddressManager()
  this.getAssetDefinitionManager().getAllAssets().forEach(function(assetdef) {
    if (addressManager.getAllAddresses(assetdef).length === 0)
      addressManager.getNewAddress(seed, assetdef)
  })

  this.config.set('initialized', true)
}

/**
 * @param {(Buffer|string)} seed
 * @throws {Error} If not initialized
 */
Wallet.prototype.isCurrentSeed = function(seed) {
  this.isInitializedCheck()
  return this.getAddressManager().isCurrentSeed(seed)
}


/**
 * @param {(Buffer|string)} seed
 * @param {Object} data
 * @param {string[]} data.monikers
 * @param {string[]} data.colorSchemes
 * @param {number} [data.unit=1]
 * @return {AssetDefinition}
 * @throws {Error} If asset already exists or not currently seed
 */
Wallet.prototype.addAssetDefinition = function(seed, data) {
  this.isInitializedCheck()
  this.getAddressManager().isCurrentSeedCheck(seed)

  var assetdef = this.getAssetDefinitionManager().createAssetDefinition(data)
  if (this.getSomeAddress(assetdef) === null)
    this.getNewAddress(seed, assetdef)

  return assetdef
}

/**
 * @param {string} moniker
 * @return {?AssetDefinition}
 * @throws {Error} If not initialized
 */
Wallet.prototype.getAssetDefinitionByMoniker = function(moniker) {
  this.isInitializedCheck()
  return this.getAssetDefinitionManager().getByMoniker(moniker)
}

/**
 * @return {AssetDefinition[]}
 * @throws {Error} If not initialized
 */
Wallet.prototype.getAllAssetDefinitions = function() {
  this.isInitializedCheck()
  return this.getAssetDefinitionManager().getAllAssets()
}

/**
 * Param asColorAddress in address method not good solution
 * But sometimes we need bitcoin address for ColorDefintion,
 *  such as in OperationalTx.getChangeAddress
 */

/**
 * Create new address for given asset
 *
 * @param {(Buffer|string)} seed
 * @param {AssetDefinition} assetdef
 * @param {boolean} [asColorAddress=false]
 * @return {string}
 * @throws {Error} If wallet not initialized or not currently seed
 */
Wallet.prototype.getNewAddress = function(seed, assetdef, asColorAddress) {
  this.isInitializedCheck()

  var address = this.getAddressManager().getNewAddress(seed, assetdef).getAddress()
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
 * @throws {Error} If wallet not initialized
 */
Wallet.prototype.getAllAddresses = function(assetdef, asColorAddress) {
  this.isInitializedCheck()

  var addresses = this.getAddressManager().getAllAddresses(assetdef)
  addresses = addresses.map(function(address) { return address.getAddress() })

  if (asColorAddress === true) {
    var assetId = assetdef.getId()
    addresses = addresses.map(function(address) { return assetId + '@' + address })
  }

  return addresses
}

/**
 * Return first address for given asset or throw Error
 *
 * @param {AssetDefinition} assetdef
 * @param {boolean} [asColorAddress=false]
 * @return {?string}
 * @throws {Error} If wallet not initialized
 */
Wallet.prototype.getSomeAddress = function(assetdef, asColorAddress) {
  this.isInitializedCheck()

  var addresses = this.getAllAddresses(assetdef, asColorAddress)
  if (addresses.length > 0)
    return addresses[0]

  return null
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
    var isValid = bitcoin.Address.fromBase58Check(address).version === this.getNetwork().pubKeyHash
    return isValid

  } catch (e) {
    return false

  }
}


Wallet.prototype._getAllAddresses = function () {
  this.isInitializedCheck()

  var addresses =_.chain(this.getAllAssetDefinitions())
    .map(function(assetdef) { return this.getAllAddresses(assetdef) }, this)
    .flatten()
    .value()
  return addresses
}

/**
 * @param {Wallet~errorCallback} cb
 * @throws {Error} If wallet not initialized
 */
Wallet.prototype.scanAllAddresses = function(cb) {
  var addresses = this._getAllAddresses()
  this.getTxFetcher().scanAddressesUnspent(addresses, cb)
}

/**
 * @param {Wallet~errorCallback} cb
 * @throws {Error} If wallet not initialized
 */
Wallet.prototype.fullScanAllAddresses = function(cb) {
  var addresses = this._getAllAddresses()
  this.getTxFetcher().fullScanAddresses(addresses, cb)
}

/**
 * @param {CoinQuery} coinQuery
 * @param {AssetDefinition} assetdef
 * @param {function} cb
 */
Wallet.prototype._getBalance = function(coinQuery, assetdef, cb) {
  var self = this

  Q.fcall(function() {
    coinQuery = coinQuery.onlyColoredAs(assetdef.getColorSet().getColorDefinitions())
    coinQuery = coinQuery.onlyAddresses(self.getAllAddresses(assetdef))

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
 * @throws {Error} If wallet not initialized
 */
Wallet.prototype.getAvailableBalance = function(assetdef, cb) {
  this.isInitializedCheck()

  var coinQuery = this.getCoinQuery()
  this._getBalance(coinQuery, assetdef, cb)
}

/**
 * @param {AssetDefinition} assetdef
 * @param {function} cb
 * @throws {Error} If wallet not initialized
 */
Wallet.prototype.getTotalBalance = function(assetdef, cb) {
  this.isInitializedCheck()

  var coinQuery = this.getCoinQuery().includeUnconfirmed()
  this._getBalance(coinQuery, assetdef, cb)
}

/**
 * @param {AssetDefinition} assetdef
 * @param {function} cb
 * @throws {Error} If wallet not initialized
 */
Wallet.prototype.getUnconfirmedBalance = function(assetdef, cb) {
  this.isInitializedCheck()

  var coinQuery = this.getCoinQuery().onlyUnconfirmed()
  this._getBalance(coinQuery, assetdef, cb)
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
 * @param {(Buffer|string)} seed
 * @param {AssetDefinition} assetdef
 * @param {rawTarget[]} rawTargets
 * @param {Wallet~sendCoins} cb
 * @throws {Error} If wallet not initialized or not currently seed
 */
Wallet.prototype.sendCoins = function(seed, assetdef, rawTargets, cb) {
  this.isInitializedCheck()
  this.getAddressManager().isCurrentSeedCheck(seed)

  var self = this

  Q.fcall(function() {
    var assetTargets = rawTargets.map(function(target) {
      var assetValue = new asset.AssetValue(assetdef, target.value)
      return new asset.AssetTarget(target.address, assetValue)
    })

    var assetTx = new tx.AssetTx(self)
    assetTx.addTargets(assetTargets)

    return Q.nfcall(tx.transformTx, assetTx, 'signed', seed)

  }).then(function(signedTx) {
    return Q.fcall(function() {
      return Q.ninvoke(self.getBlockchain(), 'sendTx', signedTx)

    }).then(function() {
      var timezoneOffset = new Date().getTimezoneOffset() * 60
      var timestamp = Math.round(+new Date()/1000) + timezoneOffset
      return Q.ninvoke(self.getTxDb(), 'addUnconfirmedTx', { tx: signedTx, timestamp: timestamp })

    }).then(function() {
      return signedTx.getId()

    })

  }).done(function(txId) { cb(null, txId) }, function(error) { cb(error) })
}

/**
 * @callback Wallet~getHistory
 * @param {?Error} error
 * @param {HistoryEntry[]} history
 */

/**
 * @param {AssetDefinition} [assetdef]
 * @param {Wallet~getHistory} cb
 */
Wallet.prototype.getHistory = function(assetdef, cb) {
  if (_.isUndefined(cb)) {
    cb = assetdef
    assetdef = null
  }

  Q.ninvoke(this.historyManager, 'getEntries').then(function(entries) {
    if (assetdef !== null) {
      var assetId = assetdef.getId()
      entries = entries.filter(function(entry) { return entry.getAsset().getId() === assetId })
    }

    return entries

  }).done(function(entries) { cb(null, entries) }, function(error) { cb(error) })
}

/**
 * @callback Wallet~issueCoins
 * @param {?Error} error
 */

/**
 * @param {(Buffer|string)} seed
 * @param {string} moniker
 * @param {string} pck
 * @param {number} units
 * @param {number} atoms
 * @param {Wallet~issueCoins} cb
 * @throws {Error} If wallet not initialized
 */
Wallet.prototype.issueCoins = function(seed, moniker, pck, units, atoms, cb) {
  this.isInitializedCheck()
  this.getAddressManager().isCurrentSeedCheck(seed)

  var self = this

  Q.fcall(function() {
    var colorDefinitionCls = self.getColorDefinitionManager().getColorDefenitionClsForType(pck)
    if (colorDefinitionCls === null)
      throw new Error('color scheme ' + pck + ' not recognized')

    var addresses = self.getAddressManager().getAllAddresses(colorDefinitionCls)
    if (addresses.length === 0)
      addresses.push(self.getAddressManager().getNewAddress(seed, colorDefinitionCls))

    var targetAddress = addresses[0].getAddress()
    var colorValue = new cclib.ColorValue(self.getColorDefinitionManager().getGenesis(), units*atoms)
    var colorTarget = new cclib.ColorTarget(targetAddress, colorValue)

    var operationalTx = new tx.OperationalTx(self)
    operationalTx.addTarget(colorTarget)

    return Q.nfcall(colorDefinitionCls.composeGenesisTx, operationalTx)

  }).then(function(composedTx) {
    return Q.nfcall(tx.transformTx, composedTx, 'signed', seed)

  }).then(function(signedTx) {
    return Q.ninvoke(self.getBlockchain(), 'sendTx', signedTx).then(function() { return signedTx })

  }).then(function(signedTx) {
    return Q.ninvoke(self.getBlockchain(), 'getBlockCount').then(function(blockCount) {
      var colorScheme = [pck, signedTx.getId(), '0', blockCount-1].join(':')

      self.addAssetDefinition(seed, {
        monikers: [moniker],
        colorSchemes: [colorScheme],
        unit: atoms
      })

      var timezoneOffset = new Date().getTimezoneOffset() * 60
      var timestamp = Math.round(+new Date()/1000) + timezoneOffset
      return Q.ninvoke(self.getTxDb(), 'addUnconfirmedTx', { tx: signedTx, timestamp: timestamp })
    })

  }).done(function() { cb(null) }, function(error) { cb(error) })
}

/**
 * Drop all data from storage's
 */
Wallet.prototype.clearStorage = function() {
  this.config.clear()
  this.cdStorage.clear()
  this.cDataStorage.clear()
  this.aStorage.clear()
  this.adStorage.clear()
  this.coinStorage.clear()
  this.txStorage.clear()
}


module.exports = Wallet
