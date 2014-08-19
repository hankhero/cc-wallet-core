var expect = require('chai').expect

var bitcoin = require('bitcoinjs-lib')
var ECPubKey = bitcoin.ECPubKey
var networks = bitcoin.networks

var Address = require('../src/address').Address


describe('Address', function() {
  var address
  var pubKey0 =  ECPubKey.fromHex('021c10af30f8380f1ff05a02e10a69bd323a7305c43dc461f79c2b27c13532a12c')

  describe('getAddress', function() {
    it('for bitcoin', function() {
      address = new Address(pubKey0, networks.bitcoin)
      expect(address.getAddress()).to.equal('18KMigSHDPVFzsgWe1mcaPPA5wSY3Ur5wS')
    })

    it('for testnet', function() {
      address = new Address(pubKey0, networks.testnet)
      expect(address.getAddress()).to.equal('mnqK1jXG2QvWmzA8MajzQJbUww3ExLrWTA')
    })
  })
})
