/**
 * @class HistoryEntry
 *
 * @param {Object} data
 * @param {coloredcoinjs-lib.Transaction} data.tx
 * @param {number} data.blockHeight
 * @param {number} data.timestamp
 * @param {ColorValue[]} data.colorValues
 * @param {AssetValue[]} data.assetValues
 */
function HistoryEntry(data) {
  this.tx = data.tx
  this.blockHeight = data.blockHeight
  this.timestamp = data.timestamp
  this.colorValues = data.colorValues
  this.assetValues = data.assetValues
}

/**
 * @return {string}
 */
HistoryEntry.prototype.getType = function() {
  throw new Error('HistoryEntry.getType not implemented')
}

/**
 * @return {number}
 */
HistoryEntry.prototype.getTimestamp = function() {
  return this.timestamp
}

/**
 * @return {ColorValue[]}
 */
HistoryEntry.prototype.getColorValues = function() {
  return this.colorValues
}

/**
 * @return {AssetValue[]}
 */
HistoryEntry.prototype.getAssetValues = function() {
  return this.assetValues
}


module.exports = HistoryEntry
