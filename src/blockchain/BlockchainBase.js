/**
 * @class BlockchainBase
 */
function BlockchainBase() {}

/**
 * @callback BlockchainBase~getBlockCount
 * @param {?Error} error
 * @param {number} blockCount
 */

/**
 * Get block count in blockchain
 * @abstract
 * @param {BlockchainBase~getBlockCount} cb
 */
BlockchainBase.prototype.getBlockCount = function() {
  throw new Error('getBlockCount not implemented')
}

/**
 * @callback BlockchainBase~getTx
 * @param {?Error} error
 * @param {Transaction} tx
 */

/**
 * Get transaction by txId
 * @abstract
 * @param {string} txId
 * @param {BlockchainBase~getTx} cb
 */
BlockchainBase.prototype.getTx = function() {
  throw new Error('getTx not implemented')
}

/**
 * @callback BlockchainBase~sendTx
 * @param {?Error} error
 * @param {string} txId
 */

/**
 * Send transaction tx to server which broadcast tx to network
 * @abstract
 * @param {Transaction} tx
 * @param {BlockchainBase~sendTx} cb
 */
BlockchainBase.prototype.sendTx = function() {
  throw new Error('sendTx not implemented')
}

/**
 * @typedef CoinObject
 * @type {Object}
 * @property {string} txId
 * @property {number} outIndex
 * @property {number} value Coin value in satoshi
 * @property {string} script
 * @property {string} address
 * @property {boolean} confirmed
 */

/**
 * @callback BlockchainBase~getUTXO
 * @param {?Error} error
 * @param {CoinObject[]} utxo
 */

/**
 * Get UTXO for given address
 * @abstract
 * @param {string} address
 * @param {BlockchainBase~getUTXO} cb
 */
BlockchainBase.prototype.getUTXO = function() {
  throw new Error('getUTXO not implemented')
}

/**
 * @typedef HistoryObject
 * @type {Object}
 * @property {string} txId
 * @property {number} confirmations
 */

/**
 * @callback BlockchainBase~getHistory
 * @param {?Error} error
 * @param {HistoryObject[]} records
 */

/**
 * Get transaction Ids for given address
 * @abstract
 * @param {string} address
 * @param {BlockchainBase~getHistory} cb
 */
BlockchainBase.prototype.getHistory = function() {
  throw new Error('getUTXO not implemented')
}


module.exports = BlockchainBase
