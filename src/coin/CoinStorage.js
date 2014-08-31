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
 * @property {boolean} [spend=false]
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
}

inherits(CoinStorage, SyncStorage)

/**
 * @param {Object} rawCoin
 * @param {string} rawCoin.txId
 * @param {number} rawCoin.outIndex
 * @param {number} rawCoin.value
 * @param {string} rawCoin.script
 * @param {string} rawCoin.address
 * @param {boolean} [rawCoin.spend=false]
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
    address: rawCoin.address,
    spend: false
  })

  this.store.set(this.coinsDbKey, records)
}

/**
 * @param {string} txId
 * @param {number} outIndex
 * @throws {Error} If coin not exists
 */
CoinStorage.prototype.markCoinAsSpend = function(txId, outIndex) {
  if (this.get(txId, outIndex) === null)
    throw new Error('Coin not exists')

  var records = this.getAll()
  records.forEach(function(record) {
    if (record.txId === txId && record.outIndex === outIndex)
      record.spend = true
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
 * Remove all coins
 */
CoinStorage.prototype.clear = function() {
  this.store.remove(this.coinsDbKey)
  this.store.remove(this.spentDbKey)
}


module.exports = CoinStorage
