var inherits = require('util').inherits

var HistoryEntry = require('./HistoryEntry')


/**
 * @class HistoryEntryReceive
 * Inherits HistoryEntry
 */
function HistoryEntryReceive() {
  HistoryEntry.apply(this, Array.prototype.slice.call(arguments))
}

inherits(HistoryEntryReceive, HistoryEntry)

/**
 * @return {string}
 */
HistoryEntryReceive.prototype.getType = function() {
  return 'receive'
}


module.exports = HistoryEntryReceive
