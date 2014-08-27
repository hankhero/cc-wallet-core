var inherits = require('util').inherits

var Q = require('q')

var BaseTxDb = require('./BaseTxDb')


/**
 * @class NaiveTxDb
 *
 * Inherits BaseTxDb
 */
function NaiveTxDb() {
  BaseTxDb.apply(this, Array.prototype.slice.call(arguments))
}

inherits(NaiveTxDb, BaseTxDb)

/**
 * @callback NaiveTxDb~identifyTxStatus
 * @param {?Error} error
 * @param {number} status
 */

/**
 * @param {string} txId
 * @param {NaiveTxDb~identifyTxStatus} cb
 */
NaiveTxDb.prototype.identifyTxStatus = function(txId, cb) {
  Q.ninvoke(this.bs, 'getTxBlockHash', txId).catch(function(error) {
    if (error instanceof Error && error.message === 'No records found') // Only Blockr interface
      return BaseTxDb.TxStatusInvalid

    throw error

  }).then(function(blockhash) {
    if (blockhash === null)
      return BaseTxDb.TxStatusUnconfirmed

    return BaseTxDb.TxStatusConfirmed

  }).done(function(status) { cb(null, status) }, function(error) { cb(error) })
}


module.exports = NaiveTxDb
