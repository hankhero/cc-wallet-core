var inherits = require('util').inherits

var _ = require('lodash')
var bitcoin = require('bitcoinjs-lib')
var HDNode = bitcoin.HDNode

var SyncStorage = require('../SyncStorage')


/**
 * @typedef {Object} AddressStorageRecord
 * @param {number} account Always equal 0
 * @param {number} chain
 * @param {number} index
 * @param {string} pubKey bitcoinjs-lib.ECPubKey in hex format
 */

/**
 * @class AddressStorage
 *
 * Inherits SyncStorage
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
 * @throw {Error} If account, chain, index or pubKey exists
 */
AddressStorage.prototype.add = function(data) {
  var pubKeys = this.getAll()

  pubKeys.forEach(function(record) {
    if (record.chain === data.chain && record.index === data.index)
      throw new Error('pubkey for given account, chain and index exists')

    if (record.pubKey === data.pubKey)
      throw new Error('pubKey already exists')
  })

  pubKeys.push({
    account: 0,
    chain: data.chain,
    index: data.index,
    pubKey: data.pubKey
  })

  this.store.set(this.dbKey, pubKeys)
}

/**
 * @param {number} chain
 * @return {AddressStorageRecord[]}
 */
AddressStorage.prototype.get = function(chain) {
  var pubKeys = this.getAll().filter(function(record) { return record.chain === chain })
  return pubKeys
}

/**
 * @return {AddressStorageRecord[]}
 */
AddressStorage.prototype.getAll = function() {
  var pubKeys = this.store.get(this.dbKey) || []
  return pubKeys
}

/**
 * Remove all records
 */
AddressStorage.prototype.clear = function() {
  this.store.remove(this.dbKey)
}


module.exports = AddressStorage
