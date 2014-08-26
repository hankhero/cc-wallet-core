var inherits = require('util').inherits

var _ = require('lodash')

var SyncStorage = require('../SyncStorage')


/**
 * @typedef {Object} CoinStorageRecord
 * @property {string} txId
 * @property {number} outIndex
 * @property {number} value
 * @property {string} script
 * @property {string} address
 */

/**
 * @typedef {Object} SpentCoinStorageRecord
 * @property {string} txId
 * @property {number} outIndex
 */

/**
 * @class CoinStorage
 *
 * Inherits SyncStorage
 */
function CoinStorage() {
  SyncStorage.apply(this, Array.prototype.slice.call(arguments))

  this.coinsDbKey = this.globalPrefix + 'coins'
  if (!_.isArray(this.store.get(this.coinsDbKey)))
    this.store.set(this.coinsDbKey, [])

  this.spentDbKey = this.globalPrefix + 'spentCoins'
  if (!_.isArray(this.store.get(this.spentCoins)))
    this.store.set(this.spentCoins, {})
}

inherits(CoinStorage, SyncStorage)

/**
 * @param {Object} rawCoin
 * @param {string} rawCoin.txId
 * @param {number} rawCoin.outIndex
 * @param {number} rawCoin.value
 * @param {string} rawCoin.script
 * @param {string} rawCoin.address
 * @throws {Error} If coin already exists
 */
CoinStorage.prototype.add = function(rawCoin) {
  var records = this.getAll()
  records.forEach(function(record) {
    if (record.txId === rawCoin.txId && record.outIndex === rawCoin.outIndex)
      throw new Error('Same coin already exists')
  })

  records.push({
    txId: rawCoin.txId,
    outIndex: rawCoin.outIndex,
    value: rawCoin.value,
    script: rawCoin.script,
    address: rawCoin.address
  })

  this.store.set(this.coinsDbKey, records)
}

/**
 * @param {string} txId
 * @param {number} outIndex
 * @return {?CoinStorageRecord}
 */
CoinStorage.prototype.get = function(txId, outIndex) {
  var records = this.getAll().filter(function(record) {
    return record.txId === txId && record.outIndex === outIndex
  })

  if (records.length === 1)
    return records[0]

  return null
}

/**
 * @param {string} address
 * @return {CoinStorageRecord[]}
 */
CoinStorage.prototype.getForAddress = function(address) {
  var records = this.getAll().filter(function(record) {
    return record.address === address
  })

  return records
}

/**
 * @return {CoinStorageRecord[]}
 */
CoinStorage.prototype.getAll = function() {
  var coins = this.store.get(this.coinsDbKey) || []
  return coins
}

/**
 * @param {string} txId
 * @param {number} outIndex
 */
CoinStorage.prototype.markCoinAsSpend = function(txId, outIndex) {
  if (this.isSpent(txId, outIndex))
    return

  var records = this.store.get(this.spentDbKey) || {}
  records[txId + outIndex] = true
  this.store.set(this.spentDbKey, records)
}

/**
 * @param {string} txId
 * @param {number} outIndex
 */
CoinStorage.prototype.isSpent = function(txId, outIndex) {
  var records = this.store.get(this.spentDbKey) || {}
  return !_.isUndefined(records[txId + outIndex])
}

/**
 * Remove all coins
 */
CoinStorage.prototype.clear = function() {
  this.store.remove(this.coinsDbKey)
  this.store.remove(this.spentDbKey)
}


module.exports = CoinStorage
