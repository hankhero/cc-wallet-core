var inherits = require('util').inherits

var _ = require('lodash')

var cclib = require('./cclib')
var verify = require('./verify')


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

  verify.string(opts.globalPrefix)

  cclib.SyncStorage.call(this, opts)
}

inherits(SyncStorage, cclib.SyncStorage)


module.exports = SyncStorage
