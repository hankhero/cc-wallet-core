var _ = require('lodash')
var Q = require('q')

var CoinList = require('./CoinList')


/**
 * @class CoinQuery
 *
 * @param {Wallet} wallet
 * @param {Object} query
 */
function CoinQuery(wallet, query) {
  this.wallet = wallet

  this.query = _.extend({
    onlyColoredAs: null,
    onlyAddresses: null,
    onlyConfirmed: false,
    onlyUnconfirmed: false
  }, query)
}

/**
 * Return clone of current CoinQuery
 *
 * @return {CoinQuery}
 */
CoinQuery.prototype.clone = function() {
  var newCoinQuery = new CoinQuery(this.wallet, this.query)
  return newCoinQuery
}

/**
 * Select coins only for given ColorDefinition
 *
 * @param {(ColorDefinition|ColorDefinition[])} colors
 * @return {CoinQuery}
 */
CoinQuery.prototype.onlyColoredAs = function(colors) {
  if (!_.isArray(colors))
    colors = [colors]

  var newCoinQuery = this.clone()
  newCoinQuery.query.onlyColoredAs = colors.map(function(cd) { return cd.getColorId() })

  return newCoinQuery
}

/**
 * Select coins only belong to given addresses
 *
 * @param {(string|string[])} data
 * @return {CoinQuery}
 */
CoinQuery.prototype.onlyAddresses = function(data) {
  if (!_.isArray(data))
    data = [data]

  var newCoinQuery = this.clone()
  newCoinQuery.query.onlyAddresses = data

  return newCoinQuery
}

/**
 * Select only confirmed coins
 *
 * @return {CoinQuery}
 */
CoinQuery.prototype.getConfirmed = function() {
  var newCoinQuery = this.clone()
  newCoinQuery.query.onlyConfirmed = true
  newCoinQuery.query.onlyUnconfirmed = false

  return newCoinQuery
}

/**
 * Select only unconfirmed coins
 *
 * @return {CoinQuery}
 */
CoinQuery.prototype.getUnconfirmed = function() {
  var newCoinQuery = this.clone()
  newCoinQuery.query.onlyConfirmed = false
  newCoinQuery.query.onlyUnconfirmed = true

  return newCoinQuery
}

/**
 * @callback CoinQuery~getCoins
 * @param {?Error} error
 * @param {CoinList} coinList
 */

/**
 * Select coins and return CoinList via cb
 *
 * @param {CoinQuery~getCoins} cb
 */
CoinQuery.prototype.getCoins = function(cb) {
  var self = this

  Q.fcall(function() {
    var assetdefs = self.wallet.getAllAssetDefinitions()
    var addresses = _.flatten(
      assetdefs.map(function(assetdef) { return self.wallet.getAllAddresses(assetdef) }))
    if (self.query.onlyAddresses !== null)
      addresses = addresses.filter(function(address) { return self.query.onlyAddresses.indexOf(address) !== -1 })

    var coinManager = self.wallet.getCoinManager()
    var coins = _.flatten(
      addresses.map(function(address) { return coinManager.getCoinsForAddress(address) }))

    coins = coins.filter(function(coin) { return !coin.isSpent() })

// parallel version
/*
    var promises = coins.map(function(coin) {
      return Q.ninvoke(coin, 'isConfirmed').then(function(isConfirmed) {
        if (self.query.onlyConfirmed && !isConfirmed)
          return

        if (self.query.onlyUnconfirmed && isConfirmed)
          return

        if (self.query.onlyColoredAs === null)
          return coin

        return Q.ninvoke(coin, 'getMainColorValue').then(function(colorValue) {
          if (self.query.onlyColoredAs.indexOf(colorValue.getColorId()) !== -1)
            return coin
        })
      })
    })

    return Q.all(promises)
*/

// sequence version
    var result = []
    var promise = Q()

    coins.forEach(function(coin) {
      promise = promise.then(function() {
        return Q.ninvoke(coin, 'isConfirmed').then(function(isConfirmed) {
          if (self.query.onlyConfirmed && !isConfirmed)
            return

          if (self.query.onlyUnconfirmed && isConfirmed)
            return

          if (self.query.onlyColoredAs === null) {
            result.push(coin)
            return
          }

          return Q.ninvoke(coin, 'getMainColorValue').then(function(colorValue) {
            if (self.query.onlyColoredAs.indexOf(colorValue.getColorId()) !== -1)
              result.push(coin)
          })
        })
      })
    })

    return promise.then(function() { return result })

  }).then(function(coins) {
    return coins.filter(function(coin) { return !_.isUndefined(coin) })

  }).done(function(coins) { cb(null, new CoinList(coins)) }, function(error) { cb(error) })
}


module.exports = CoinQuery
