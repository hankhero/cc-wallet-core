var inherits = require('util').inherits

var _ = require('lodash')
var cclib = require('coloredcoinjs-lib')

/*
 * @class SyncStorage
 * @extends coloredcoinjs-lib.SyncStorage
 *
 * @param {Object} opts
 * @param {string} [opts.globalPrefix=cc_wallet_]
 */
function SyncStorage(opts) {
  opts = _.extend({
    globalPrefix: 'cc_wallet_'
  }, opts)

  cclib.SyncStorage.call(this, opts)
}

inherits(SyncStorage, cclib.SyncStorage)


module.exports = SyncStorage
