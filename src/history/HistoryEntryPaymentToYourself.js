var inherits = require('util').inherits

var HistoryEntry = require('./HistoryEntry')


/**
 * @class HistoryEntryPaymentToYourself
 * Inherits HistoryEntry
 */
function HistoryEntryPaymentToYourself() {
  HistoryEntry.apply(this, Array.prototype.slice.call(arguments))
}

inherits(HistoryEntryPaymentToYourself, HistoryEntry)

/**
 * @return {string}
 */
HistoryEntryPaymentToYourself.prototype.getType = function() {
  return 'p2y'
}


module.exports = HistoryEntryPaymentToYourself
