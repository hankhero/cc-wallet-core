/**
 * @class Coin
 *
 * @param {Wallet} coinManager
 * @param {Object} rawCoin
 * @param {string} rawCoin.txId
 * @param {number} rawCoin.outIndex
 * @param {number} rawCoin.value
 * @param {string} rawCoin.script
 * @param {string} rawCoin.address
 */
function Coin(coinManager, rawCoin) {
  this.coinManager = coinManager

  this.txId = rawCoin.txId
  this.outIndex = rawCoin.outIndex
  this.value = rawCoin.value
  this.script = rawCoin.script
  this.address = rawCoin.address
}

Coin.prototype.toRawCoin = function () {
    return {
        txId: this.txId,
        outIndex: this.outIndex,
        value: this.value,
        script: this.script,
        address: this.address
    };
}

/**
 * {@link CoinManager.isCoinSpent}
 */
Coin.prototype.isSpent = function() {
  return this.coinManager.isCoinSpent(this)
}

/**
 * {@link CoinManager.isCoinConfirmed}
 */
Coin.prototype.isConfirmed = function(cb) {
  this.coinManager.isCoinConfirmed(this, cb)
}

/**
 * {@link CoinManager.getCoinColorValue}
 */
Coin.prototype.getColorValue = function(colorDefinition, cb) {
  this.coinManager.getCoinColorValue(this, colorDefinition, cb)
}

/**
 * {@link CoinManager.getMainCoinColorValue}
 */
Coin.prototype.getMainColorValue = function (cb) {
  this.coinManager.getMainCoinColorValue(this, cb)
}

/**
 * @return {string}
 */
Coin.prototype.toString = function() {
  return this.txId + ':' + this.outIndex
}


module.exports = Coin
