var inherits = require('util').inherits

var _ = require('lodash')

var SyncStorage = require('../SyncStorage')


/**
 * @typedef {Object} TxStorageRecord
 * @property {string} txId
 * @property {string} rawTx
 * @property {number} status
 * @property {number} blockHeight
 */

/**
 * @class TxStorage
 *
 * Inherits SyncStorage
 */
function TxStorage() {
  SyncStorage.apply(this, Array.prototype.slice.call(arguments))

  this.dbKey = this.globalPrefix + 'tx'

  if (!_.isArray(this.store.get(this.dbKey)))
    this.store.set(this.dbKey, {})
}

inherits(TxStorage, SyncStorage)

/**
 * @param {string} txId
 * @param {string} rawTx
 * @param {number} status
 * @throws {Error} If txId exists
 */
TxStorage.prototype.addTx = function(txId, rawTx, status) {
  var records = this.getAll()
  if (!_.isUndefined(records[txId]))
    throw new Error('Same tx already exists')

  records[txId] = {
    txId: txId,
    rawTx: rawTx,
    status: status,
    blockHeight: null
  }

  this.store.set(this.dbKey, records)
}

/**
 * @param {string} txId
 * @param {number} status
 * @throws {Error} If txId not exists
 */
TxStorage.prototype.setTxStatus = function(txId, status) {
  var records = this.getAll()

  if (_.isUndefined(records[txId]))
    throw new Error('txId not exists')

  records[txId].status = status

  this.store.set(this.dbKey, records)
}

/**
 * @param {string} txId
 * @param {number} blockHeight
 * @throws {Error} If txId not exists
 */
TxStorage.prototype.setBlockHeight = function(txId, blockHeight) {
  var records = this.getAll()

  if (_.isUndefined(records[txId]))
    throw new Error('txId not exists')

  records[txId].blockHeight = blockHeight

  this.store.set(this.dbKey, records)
}

/**
 * @return {?TxStorageRecord}
 */
TxStorage.prototype.getTxById = function(txId) {
  var record = this.getAll()[txId] || null
  return record
}

/**
 * @return {TxStorageRecord[]}
 */
TxStorage.prototype.getAll = function() {
  var records = this.store.get(this.dbKey) || {}
  return records
}

/**
 * Drop all tx
 */
TxStorage.prototype.clear = function() {
  this.store.remove(this.dbKey)
}


module.exports = TxStorage
