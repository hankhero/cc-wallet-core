/**
 * @class HistoryEntry
 *
 * @param {Object} data
 * @param {coloredcoinjs-lib.Transaction} data.tx
 * @param {number} data.blockHeight
 * @param {number} data.timestamp
 * @param {ColorValue[]} data.colorValues
 * @param {AssetValue[]} data.assetValues
 * @param {number} data.entryType
 */
function HistoryEntry(data) {
  this.tx = data.tx
  this.blockHeight = data.blockHeight
  this.timestamp = data.timestamp
  this.colorValues = data.colorValues
  this.assetValues = data.assetValues
  this.entryType = data.entryType
}

HistoryEntry.entryTypes = {
  Send: 0,
  Receive: 1,
  PaymentToYourself: 2,
  Issue: 3
}

/**
 * @return {number}
 */
HistoryEntry.prototype.getBlockHeight = function() {
  return this.blockHeight
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

/**
 * @return {boolean}
 */
HistoryEntry.prototype.isSend = function() {
  return this.entryType === HistoryEntry.entryTypes.Send
}

/**
 * @return {boolean}
 */
HistoryEntry.prototype.isReceive = function() {
  return this.entryType === HistoryEntry.entryTypes.Receive
}

/**
 * @return {boolean}
 */
HistoryEntry.prototype.isPaymentToYourself = function() {
  return this.entryType === HistoryEntry.entryTypes.PaymentToYourself
}

/**
 * @return {boolean}
 */
HistoryEntry.prototype.isIssue = function() {
  return this.entryType === HistoryEntry.entryTypes.Issue
}


module.exports = HistoryEntry
