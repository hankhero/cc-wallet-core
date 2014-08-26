var Q = require('q')


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
 * @param {string} txId
 * @return {Q.Promise}
 */
TxFetcher.prototype._addTxId = function(txId) {
  return Q.ninvoke(this.txdb, 'addTxById', txId)
}

/**
 * @param {string} address
 * @param {TxFetcher~errorCallback} cb
 */
TxFetcher.prototype.scanAddressUnspent = function(address, cb) {
  var self = this

  Q.ninvoke(self.bs, 'getUTXO', address).then(function(objs) {
    var promises = objs.map(function(obj) {
      return self._addTxId(obj.txId)
    })

    return Q.all(promises)

  }).done(function() { cb(null) }, function(error) { cb(error) })
}

/**
 * @param {string[]} addresses
 * @param {TxFetcher~errorCallback} cb
 */
TxFetcher.prototype.scanAddressesUnspent = function(addresses, cb) {
  var self = this

  var promises = addresses.map(function(address) {
    return Q.ninvoke(self, 'scanAddressUnspent', address)
  })

  return Q.all(promises).done(function() { cb(null) }, function(error) { cb(error) })
}

/**
 * @param {string} address
 * @param {TxFetcher~errorCallback} cb
 */
TxFetcher.prototype.fullScanAddress = function(address, cb) {
  var self = this

  Q.fcall(function() {
    return Q.ninvoke(self.bs, 'getHistory', address)

  }).then(function(historyObjs) {
    var promises = historyObjs.map(function(obj) {
      return self._addTxId(obj.txId)
    })

    return Q.all(promises)

  }).then(function() {
    return Q.ninvoke(self, 'scanAddressUnspent', address)

  }).done(function() { cb(null) }, function(error) { cb(error) })
}

/**
 * @param {string[]} addresses
 * @param {TxFetcher~errorCallback} cb
 */
TxFetcher.prototype.fullScanAddresses = function(addresses, cb) {
  var self = this

  var promises = addresses.map(function(address) {
    return Q.ninvoke(self, 'fullScanAddress', address)
  })

  return Q.all(promises).done(function() { cb(null) }, function(error) { cb(error) })
}


module.exports = TxFetcher
