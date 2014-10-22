var inherits = require('util').inherits

var _ = require('lodash')

var SyncStorage = require('../SyncStorage')
var verify = require('../verify')


/**
 * @typedef {Object} AddressStorageRecord
 * @param {number} account Always equal 0
 * @param {number} chain
 * @param {number} index
 * @param {string} pubKey Hex string
 */

/**
 * @class AddressStorage
 * @extends SyncStorage
 */
function AddressStorage() {
  SyncStorage.apply(this, Array.prototype.slice.call(arguments))

  this.dbKey = this.globalPrefix + 'pubKeys'

  if (!_.isArray(this.store.get(this.dbKey)))
    this.store.set(this.dbKey, [])
}

inherits(AddressStorage, SyncStorage)

/*
 * @param {Object} data
 * @param {number} data.chain
 * @param {number} data.index
 * @param {string} data.pubKey bitcoinjs-lib.ECPubKey in hex format
 * @return {AddressStorageRecord}
 * @throw {Error} If account, chain, index or pubKey exists
 */
AddressStorage.prototype.add = function(data) {
  verify.object(data)
  verify.number(data.chain)
  verify.number(data.index)
  verify.hexString(data.pubKey)

  var pubKeys = this.getAll()

  pubKeys.forEach(function(record) {
    if (record.chain === data.chain && record.index === data.index)
      throw new Error('pubkey for given account, chain and index exists')

    if (record.pubKey === data.pubKey)
      throw new Error('pubKey already exists')
  })

  var record = {
    account: 0,
    chain: data.chain,
    index: data.index,
    pubKey: data.pubKey
  }

  pubKeys.push(record)
  this.store.set(this.dbKey, pubKeys)

  return record
}

/**
 * @param {number} [chain]
 * @return {AddressStorageRecord[]}
 */
AddressStorage.prototype.getAll = function(chain) {
  var pubKeys = this.store.get(this.dbKey) || []

  if (!_.isUndefined(chain)) {
    verify.number(chain)
    pubKeys = pubKeys.filter(function(record) { return record.chain === chain })
  }

  return pubKeys
}

/**
 * Remove all records
 */
AddressStorage.prototype.clear = function() {
  this.store.remove(this.dbKey)
}


module.exports = AddressStorage
