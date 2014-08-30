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

  this.masterKeyDBKey = this.globalPrefix + 'masterKey'
  this.pubKeysDBKey = this.globalPrefix + 'pubKeys'

  if (!_.isString(this.store.get(this.masterKeyDBKey))) {
    this.store.remove(this.masterKeyDBKey)
    this.store.set(this.pubKeysDBKey, [])
  }

  if (!_.isArray(this.store.get(this.pubKeysDBKey)))
    this.store.set(this.pubKeysDBKey, [])
}

inherits(AddressStorage, SyncStorage)

/**
 * Save masterKey in base58 format
 *
 * @param {string} masterKey
 */
AddressStorage.prototype.setMasterKey = function(newMasterKey) {
  HDNode.fromBase58(newMasterKey) // Check masterKey

  var currentMasterKey = this.getMasterKey()
  this.store.set(this.masterKeyDBKey, newMasterKey)

  if (currentMasterKey !== newMasterKey)
    this.store.set(this.pubKeysDBKey, [])
}

/**
 * Get masterKey from store in base58
 *
 * @return {?srting}
 */
AddressStorage.prototype.getMasterKey = function() {
  var masterKey = this.store.get(this.masterKeyDBKey)
  return _.isUndefined(masterKey) ? null : masterKey
}

/*
 * @param {Object} data
 * @param {number} data.chain
 * @param {number} data.index
 * @param {string} data.pubKey bitcoinjs-lib.ECPubKey in hex format
 * @return {AddressStorageRecord}
 * @throw {Error} If account, chain, index or pubKey exists
 */
AddressStorage.prototype.addPubKey = function(data) {
  var pubKeys = this.store.get(this.pubKeysDBKey) || []

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

  this.store.set(this.pubKeysDBKey, pubKeys)

  return record
}

/**
 * @param {number} [chain]
 * @return {AddressStorageRecord[]}
 */
AddressStorage.prototype.getPubKeys = function(chain) {
  var pubKeys = this.store.get(this.pubKeysDBKey) || []

  if (!_.isUndefined(chain))
    pubKeys = pubKeys.filter(function(record) { return record.chain === chain })

  return pubKeys
}

/**
 * Remove masterKey and all pubKeys
 */
AddressStorage.prototype.clear = function() {
  this.store.remove(this.masterKeyDBKey)
  this.store.remove(this.pubKeysDBKey)
}


module.exports = AddressStorage
