var util = require('util')

var Q = require('q')
var cclib = require('coloredcoinjs-lib')

/**
 * @class OperationalTx
 *
 * @param {Wallet} wallet
 * @param {AssetDefinition} assetdef
 */
function OperationalTx(wallet, assetdef) {
  this.wallet = wallet
  this.assetdef = assetdef
  this.targets = []
}

util.inherits(OperationalTx, cclib.tx.OperationalTx)

/**
 * Add ColorTarget to current tx
 *
 * @param {ColorTarget} target
 */
OperationalTx.prototype.addTarget = function(target) {

  this.targets.push(target)
}

/**
 * Vectorized version of addTarget
 *
 * @param {ColorTarget[]} targets
 */
OperationalTx.prototype.addTargets = function(targets) {
  targets.forEach(this.addTarget.bind(this))
}

/**
 * Return ColorTargets of current transaction
 *
 * @return {ColorTarget[]}
 */
OperationalTx.prototype.getTargets = function() {
  // Todo: make copy
  return this.targets
}

/**
 * Return true if transaction represent 1 color
 *
 * @return {boolean}
 * @throws {Error} Will throw an error if current transaction don't have targets
 */
OperationalTx.prototype.isMonoColor = function() {
  if (this.targets.length === 0)
    throw new Error('color targets not found')

  var colorId = this.targets[0].getColorId()
  var isMonoColor = this.targets.every(function(target) { return target.getColorId() === colorId })

  return isMonoColor
}

/**
 * @param {number} txSize
 * @return {ColorValue}
 */
OperationalTx.prototype.getRequiredFee = function(txSize) {
  var baseFee = 10000
  var feeValue = Math.ceil((txSize * baseFee) / 1000)

  return new cclib.color.ColorValue(new cclib.color.UncoloredColorDefinition(), feeValue)
}

/**
 * @return {ColorValue}
 */
OperationalTx.prototype.getDustThreshold = function() {
  return new cclib.color.ColorValue(new cclib.color.UncoloredColorDefinition(), 5500)
}

/**
 * @callback OperationalTx~selectCoins
 * @param {?Error}
 * @param {Coin[]} utxo
 * @param {ColorValue} utxoColorValue
 */

/*
 * @param {ColorValue}
 * @param {?Object} [feeEstimator=null]
 * @param {OperationalTx~selectCoins} cb
 */
OperationalTx.prototype.selectCoins = function(colorValue, feeEstimator, cb) {
  var self = this

  var colordef

  Q.fcall(function() {
    colordef = colorValue.getColorDefinition()

    if (!colorValue.isUncolored() && feeEstimator !== null)
      throw new Error('feeEstimator can only be used with uncolored coins')

    var coinQuery = self.wallet.getCoinQuery()
    coinQuery = coinQuery.onlyColoredAs(colordef)
    coinQuery = coinQuery.onlyAddresses(self.wallet.getAllAddresses(colordef))

    return Q.ninvoke(coinQuery, 'getCoins')

  }).then(function(coinList) {
    var coins = coinList.getCoins()

    var selectedCoinsColorValue = new cclib.color.ColorValue(colordef, 0)
    var selectedCoins = []

    var requiredSum = colorValue.clone()
    if (feeEstimator !== null)
      requiredSum = requiredSum.plus(feeEstimator.estimateRequiredFee({ extraTxIns: coins.length }))

    function appendUntil(index) {
      if (selectedCoinsColorValue.getValue() >= requiredSum.getValue())
        return { coins: selectedCoins, value: selectedCoinsColorValue }

      if (index === coins.length)
        throw new Error(
          'not enough coins: ' + requiredSum.getValue() + ' requested, ' + selectedCoinsColorValue.getValue() +' found')

      return Q.ninvoke(coins[index], 'getMainColorValue')
        .then(function(coinColorValue) {
          selectedCoinsColorValue = selectedCoinsColorValue.plus(coinColorValue)
          selectedCoins.push(coins[index])

          return appendUntil(index+1)
        })
    }

    return appendUntil(0)

  }).then(function(data) {
    cb(null, data.coins, data.value)

  }).fail(function(error) {
    cb(error)

  }).done()
}

/**
 * @return {string}
 * @throws {Error} If targets not found or multi-color
 */
OperationalTx.prototype.getChangeAddress = function(colordef) {
  if (!this.isMonoColor())
    throw new Error('multi-color not supported')

  return this.wallet.getSomeAddress(colordef)
}


module.exports = OperationalTx
