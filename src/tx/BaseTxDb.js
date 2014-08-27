var cclib = require('coloredcoinjs-lib')
var _ = require('lodash')
var LRU = require('lru-cache')
var Q = require('q')


var RecheckInterval = 60 * 1000

/**
 * @class BaseTxDb
 *
 * @param {TxStorage} txStorage
 * @param {CoinManager} coinManager
 * @param {BlockchainBase} bs
 */
function BaseTxDb(txStorage, coinManager, bs) {
  this.txStorage = txStorage
  this.coinManager = coinManager
  this.bs = bs

  this.lastStatusCheck = LRU({ maxAge: RecheckInterval })
}

BaseTxDb.TxStatusUnknown = 0
BaseTxDb.TxStatusUnconfirmed = 1
BaseTxDb.TxStatusConfirmed = 2
BaseTxDb.TxStatusInvalid = 3

/**
 * @callback BaseTxDb~errorCallback
 * @param {?Error} error
 */

/**
 * @param {coloredcoinjs-lib.Transaction} tx
 * @param {BaseTxDb~errorCallback} cb
 */
BaseTxDb.prototype.addUnonfirmedTx = function(tx, cb) {
  this.addTx(tx, BaseTxDb.TxStatusUnconfirmed, cb)
}

/**
 * @param {coloredcoinjs-lib.Transaction} tx
 * @param {?number} status
 * @param {BaseTxDb~errorCallback} cb
 */
BaseTxDb.prototype.addTx = function(tx, status, cb) {
  var self = this

  Q.fcall(function() {
    var txId = tx.getId()

    var record = self.txStorage.getTxById(txId)
    if (record !== null)
      return Q.ninvoke(self, 'maybeRecheckTxStatus', record.txId, record.status)

    return Q.fcall(function() {
      if (status === null)
        return Q.ninvoke(self, 'identifyTxStatus', txId)
      return status

    }).then(function(status) {
      self.txStorage.addTx(txId, tx.toHex(), status)
      return Q.ninvoke(self, 'updateTxBlockHeight', txId, status)

    }).then(function() {
      self.lastStatusCheck.set(txId, true)
      return Q.ninvoke(self.coinManager, 'applyTx', tx)

    })

  }).done(function() { cb(null) }, function(error) { cb(error) })
}

/**
 * @param {string} txId
 * @return {?coloredcoinjs-lib.Transaction} tx
 */
BaseTxDb.prototype.getTxById = function(txId) {
  var record = this.txStorage.getTxById(txId)
  if (record === null)
    return null

  return cclib.Transaction.fromHex(record.rawTx)
}

/**
 * @param {string} txId
 * @param {number} status
 * @param {BaseTxDb~errorCallback} cb
 */
BaseTxDb.prototype.maybeRecheckTxStatus = function(txId, status, cb) {
  var self = this

  Q.fcall(function() {
    if (status === BaseTxDb.TxStatusConfirmed)
      return

    if (!_.isUndefined(self.lastStatusCheck.get(txId)))
      return

    self.lastStatusCheck.set(txId, true)

    return Q.ninvoke(self, 'identifyTxStatus', txId).then(function(status) {
      self.txStorage.setTxStatus(txId, status)
      return Q.ninvoke(self, 'updateTxBlockHeight', txId, status)

    })

  }).done(function() { cb(null) }, function(error) { cb(error) })
}

/**
 * @param {string} txId
 * @param {number} status
 * @param {BaseTxDb~errorCallback} cb
 */
BaseTxDb.prototype.updateTxBlockHeight = function(txId, status, cb) {
  var self = this

  Q.fcall(function() {
    if (status !== BaseTxDb.TxStatusConfirmed)
      return

    return Q.ninvoke(self.bs, 'getTxBlockHash', txId).then(function(blockHash) {
      return Q.ninvoke(self.bs, 'getBlockHeight', blockHash)

    }).then(function(height) {
      self.txStorage.setBlockHeight(txId, height)

    })

  }).done(function() { cb(null) }, function(error) { cb(error) })
}

/**
 * @callback BaseTxDb~isTxConfirmed
 * @param {Error} error
 * @param {boolean} isConfirmed
 */

/**
 * @param {string} txId
 * @param {BaseTxDb~isTxConfirmed} cb
 */
BaseTxDb.prototype.isTxConfirmed = function(txId, cb) {
  var self = this

  Q.fcall(function() {
    var record = self.txStorage.getTxById(txId)
    if (record === null)
      throw new Error('Tx not found')

    return record.status

  }).then(function(status) {
    if (status === BaseTxDb.TxStatusConfirmed)
      return status

    return Q.ninvoke(self, 'maybeRecheckTxStatus', txId, status)

  }).then(function(status) {
    return status === BaseTxDb.TxStatusConfirmed

  }).done(function(isConfirmed) { cb(null, isConfirmed) }, function(error) { cb(error) })
}

/**
 * @callback BaseTxDb~isTxValid
 * @param {Error} error
 * @param {boolean} isValid
 */

/**
 * @param {string} txId
 * @param {BaseTxDb~isTxValid} cb
 */
BaseTxDb.prototype.isTxValid = function(txId, cb) {
  var self = this

  Q.fcall(function() {
    var record = self.txStorage.getTxById(txId)
    if (record === null)
      throw new Error('Tx not found')

    return record.status

  }).then(function(status) {
    if (status === BaseTxDb.TxStatusConfirmed)
      return status

    return Q.ninvoke(self, 'maybeRecheckTxStatus', txId, status)

  }).then(function(status) {
    return status !== BaseTxDb.TxStatusInvalid

  }).done(function(isValid) { cb(isValid) }, function(error) { cb(error) })
}


module.exports = BaseTxDb
