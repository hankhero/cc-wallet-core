var inherits = require('util').inherits

var _ = require('lodash')
var cclib = require('coloredcoinjs-lib')

/*
 * @class SyncStorage
 *
 * Inherits coloredcoinjs-lib.storage.SyncStorage
 *
 * @param {Object} opts
 * @param {string} [opts.globalPrefix=cc_wallet_]
 */
function SyncStorage(opts) {
  opts = _.isUndefined(opts) ? {} : opts
  opts.globalPrefix = _.isUndefined(opts.globalPrefix) ? 'cc_wallet_' : opts.globalPrefix

  cclib.storage.SyncStorage.call(this, opts)
}

inherits(SyncStorage, cclib.storage.SyncStorage)


module.exports = SyncStorage
