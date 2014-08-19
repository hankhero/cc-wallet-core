var assert = require('assert')
var _ = require('lodash')

var bitcoin = require('bitcoinjs-lib')
var ECPubKey = bitcoin.ECPubKey
var networks = Object.keys(bitcoin.networks).map(function(key) { return bitcoin.networks[key] })


/**
 * @class Address
 *
 * @param {bitcoinjs-lib.ECPubKey} pubKey
 * @param {Object} network Network description from bitcoinjs-lib.networks
 */
function Address(pubKey, network) {
  assert(pubKey instanceof ECPubKey, 'Expected bitcoinjs-lib.ECPubKey pubKey, got ' + pubKey)
  assert(networks.indexOf(network) !== -1, 'Unknow network type, got ' + network)

  this.pubKey = pubKey
  this.network = network
}

/**
 * Return address for network (bitcoin, testnet)
 */
Address.prototype.getAddress = function() {
  return this.pubKey.getAddress(this.network).toBase58Check()
}

Address.prototype.toString = Address.prototype.getAddress


module.exports = Address
