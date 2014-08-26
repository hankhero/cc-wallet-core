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
    this.store.set(this.dbKey, [])
}

inherits(TxStorage, SyncStorage)

/**
 * @param {string} txId
 * @param {string} rawTx
 * @param {number} status
 * @throws {Error} If record fields txId or rawTx equal to param fields
 */
TxStorage.prototype.addTx = function(txId, rawTx, status) {
  var records = this.getAll()
  records.forEach(function(record) {
    if (record.txId === txId || record.rawTx === rawTx)
      throw new Error('Same tx already exists')
  })

  records.push({
    txId: txId,
    rawTx: rawTx,
    status: status,
    blockHeight: null
  })

  this.store.set(this.dbKey, records)
}

/**
 * @param {string} txId
 * @param {number} status
 * @throws {Error} If txId not exists
 */
TxStorage.prototype.setTxStatus = function(txId, status) {
  var records = this.getAll()

  var exists = records.some(function(record) {
    if (record.txId === txId) {
      record.status = status
      return true
    }

    return false
  })
  if (!exists)
    throw new Error('txId not exists')

  this.store.set(this.dbKey, records)
}

/**
 * @param {string} txId
 * @param {number} blockHeight
 * @throws {Error} If txId not exists
 */
TxStorage.prototype.setBlockHeight = function(txId, blockHeight) {
  var records = this.getAll()

  var exists = records.some(function(record) {
    if (record.txId === txId) {
      record.blockHeight = blockHeight
      return true
    }

    return false
  })
  if (!exists)
    throw new Error('txId not exists')

  this.store.set(this.dbKey, records)
}

/**
 * @return {?TxStorageRecord}
 */
TxStorage.prototype.getTxById = function(txId) {
  var records = this.getAll().filter(function(record) {
    return record.txId === txId
  })

  if (records.length === 1)
    return records[0]

  return null
}

/**
 * @return {TxStorageRecord[]}
 */
TxStorage.prototype.getAll = function() {
  var records = this.store.get(this.dbKey) || []
  return records
}

/**
 * Drop all tx
 */
TxStorage.prototype.clear = function() {
  this.store.remove(this.dbKey)
}


module.exports = TxStorage
