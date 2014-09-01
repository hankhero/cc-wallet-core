var inherits = require('util').inherits

var HistoryEntry = require('./HistoryEntry')


/**
 * @class HistoryEntrySend
 * Inherits HistoryEntry
 */
function HistoryEntrySend() {
  HistoryEntry.apply(this, Array.prototype.slice.call(arguments))
}

inherits(HistoryEntrySend, HistoryEntry)

/**
 * @return {string}
 */
HistoryEntrySend.prototype.getType = function() {
  return 'send'
}


module.exports = HistoryEntrySend
