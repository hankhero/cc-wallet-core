var _ = require('lodash')
var Q = require('q')

var toposort = require('./toposort')


/**
 * @callback TxFetcher~errorCallback
 * @param {?Error} error
 */

/**
 * @class TxFetcher
 *
 * @param {BaseTxDb} txdb
 * @param {BlockchainBase} bs
 */
function TxFetcher(txdb, bs) {
  this.txdb = txdb
  this.bs = bs
}

/**
 * @typedef {Object} TxFetcher~_addRecords~records
 * @property {string} txId
 * @property {number} confirmations
 */

/**
 * @param {TxFetcher~_addRecords~records[]} records
 * @return {Q.Promise}
 */
TxFetcher.prototype._addRecords = function(records) {
  var self = this

  return Q.fcall(function() {
    var promises = _.chain(records)
      .flatten()
      .uniq('txId')
      .sortBy('confirmations')
      .reverse()
      .map(function(record) {
        var tx = self.txdb.getTxById(record.txId)
        if (tx !== null)
          return tx

        return Q.ninvoke(self.bs, 'getTx', record.txId)
      })
      .value()

    return Q.all(promises).then(toposort)

  }).then(function(transactions) {
    var promise = Q()

    transactions.forEach(function(tx) {
      promise = promise.then(function() { return Q.ninvoke(self.txdb, 'addTx', { tx: tx }) })
    })

    return promise
  })
}

/**
 * @param {string} address
 * @param {TxFetcher~errorCallback} cb
 */
TxFetcher.prototype.scanAddressUnspent = function(address, cb) {
  this.scanAddressesUnspent([address], cb)
}

/**
 * @param {string[]} addresses
 * @param {TxFetcher~errorCallback} cb
 */
TxFetcher.prototype.scanAddressesUnspent = function(addresses, cb) {
  var self = this

  Q.fcall(function() {
    var promises = addresses.map(function(address) {
      return Q.ninvoke(self.bs, 'getUTXO', address)
    })

    return Q.all(promises)

  }).then(self._addRecords.bind(self)).done(function() { cb(null) }, function(error) { cb(error) })
}

/**
 * @param {string} address
 * @param {TxFetcher~errorCallback} cb
 */
TxFetcher.prototype.fullScanAddress = function(address, cb) {
  this.fullScanAddresses([address], cb)
}

/**
 * @param {string[]} addresses
 * @param {TxFetcher~errorCallback} cb
 */
TxFetcher.prototype.fullScanAddresses = function(addresses, cb) {
  var self = this

  Q.fcall(function() {
    var promises = []

    addresses.forEach(function(address) {
      promises.push(Q.ninvoke(self.bs, 'getUTXO', address))
      promises.push(Q.ninvoke(self.bs, 'getHistory', address))
    })

    return Q.all(promises)

  }).then(self._addRecords.bind(self)).done(function() { cb(null) }, function(error) { cb(error) })
}


module.exports = TxFetcher
