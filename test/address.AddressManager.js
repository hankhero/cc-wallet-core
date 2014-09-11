var expect = require('chai').expect

var bitcoin = require('bitcoinjs-lib')
var networks = bitcoin.networks
var cclib = require('coloredcoinjs-lib')

var address = require('../src/address')


describe('address.AddressManager', function() {
  var cdStorage, cdManager, uncolored
  var am, amStorage

  var seedHex = '00000000000000000000000000000000'
  var address0 = '18KMigSHDPVFzsgWe1mcaPPA5wSY3Ur5wS'

  beforeEach(function() {
    cdStorage = new cclib.ColorDefinitionStorage()
    cdManager = new cclib.ColorDefinitionManager(cdStorage)
    uncolored = cdManager.getUncolored()
    amStorage = new address.AddressStorage()
    am = new address.AddressManager(amStorage, networks.bitcoin)
  })

  afterEach(function() {
    cdStorage.clear()
    amStorage.clear()
  })

  describe('getNewAddress', function() {
    it('getNewAddress once', function() {
      var newAddress = am.getNewAddress(seedHex, uncolored)
      expect(newAddress.getAddress()).to.equal(address0)
    })
  })

  describe('getAllAddresses', function() {
    it('getAllAddresses', function() {
      var address0 = am.getNewAddress(seedHex, uncolored).getAddress()
      var addresses = am.getAllAddresses(uncolored).map(function(address) { return address.getAddress() })
      expect(addresses).to.deep.equal([address0])
    })
  })
})
