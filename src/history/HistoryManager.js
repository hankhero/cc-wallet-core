var _ = require('lodash')
var Q = require('q')

var AssetValue = require('../asset').AssetValue
var toposort = require('../tx').toposort

var HistoryEntryPaymentToYourself = require('./HistoryEntryPaymentToYourself')
var HistoryEntryReceive = require('./HistoryEntryReceive')
var HistoryEntrySend = require('./HistoryEntrySend')


/**
 * @class HistoryManager
 *
 * @param {Wallet} wallet
 */
function HistoryManager(wallet) {
  this.wallet = wallet
}

/**
 * @return {HistoryEntry[]} entries
 */
HistoryManager.prototype.getEntries = function(cb) {
  var self = this

  Q.fcall(function() {
    return Q.ninvoke(self.wallet.getCoinQuery().includeSpent().includeUnconfirmed(), 'getCoins')

  }).then(function(coinList) {
    var txDb = self.wallet.getTxDb()
    var transactions = _.chain(coinList.getCoins())
      .pluck('txId')
      .uniq()
      .map(function(txId) {
        var entry = {
          tx: txDb.getTxById(txId),
          blockHeight: txDb.getBlockHeightByTxId(txId)
        }
        if (entry.tx === null)
          throw new Error('txId ' + txId + ' not found in txDb')

        return [entry.tx.getId(), entry]
      })
      .sortBy(function(entry) { return entry[1].blockHeight }) // sort by timestamp as second property
      .value()

    var txEntries = _.zipObject(transactions)
    transactions = transactions.map(function(entry) { return entry[1].tx })

    var promise = Q()
    var entries = []
    var coins = _.zipObject(coinList.getCoins().map(function(coin) { return [coin.txId+coin.outIndex, coin] }))

    toposort(transactions).forEach(function(tx) {
      var ins = tx.ins.map(function(input) {
        var txId = Array.prototype.reverse.call(new Buffer(input.hash)).toString('hex')
        return coins[txId+input.index]
      })
      var outs = tx.outs.map(function(output, index) {
        return coins[tx.getId()+index]
      })

      var colorValues = {}
      _.filter(ins).forEach(function(coin) {
        promise = promise.then(function() { return Q.ninvoke(coin, 'getMainColorValue') }).then(function(cv) {
          var cid = cv.getColorId()
          if (_.isUndefined(colorValues[cid]))
            colorValues[cid] = cv.neg()
          else
            colorValues[cid] = colorValues[cid].minus(cv)
        })
      })
      _.filter(outs).forEach(function(coin) {
        promise = promise.then(function() { return Q.ninvoke(coin, 'getMainColorValue') }).then(function(cv) {
          var cid = cv.getColorId()
          if (_.isUndefined(colorValues[cid]))
            colorValues[cid] = cv
          else
            colorValues[cid] = colorValues[cid].plus(cv)
        })
      })

      promise = promise.then(function() {
        var assetValues = {}
        _.values(colorValues).forEach(function(cv) {
          var scheme = cv.getColorDefinition().getScheme()
          var assetdef = self.wallet.getAssetDefinitionManager().getByScheme(scheme)
          if (assetdef === null)
            throw new Error('asset for ColorValue ' + cv + ' not found')
          if (!_.isUndefined(assetValues[assetdef.getId()]))
            throw new Error('multi asset not supported')
          assetValues[assetdef.getId()] = new AssetValue(assetdef, cv.getValue())
        })

        var HistoryEntryCls = HistoryEntrySend
        if (_.filter(outs).length === 0)
          HistoryEntryCls = HistoryEntryReceive
        if (_.filter(ins).length === tx.ins.length && _.filter(outs).length === tx.outs.length)
          HistoryEntryCls = HistoryEntryPaymentToYourself

        entries.push(new HistoryEntryCls({
          tx: tx,
          blockHeight: txEntries[tx.getId()].blockHeight,
          timestamp: undefined, // ?
          colorValues: _.values(colorValues),
          assetValues: _.values(assetValues)
        }))
      })
    })

    return promise.then(function() { return entries })

  }).done(function(entries) { cb(null, entries) }, function(error) { cb(error) })
}


module.exports = HistoryManager
