var expect = require('chai').expect

var bitcoin = require('bitcoinjs-lib')
var networks = bitcoin.networks
var cclib = require('coloredcoinjs-lib')

var AddressManager = require('../src/address').AddressManager
var storage = require('../src/storage')


describe('AddressManager', function() {
  var cdStorage, cdManager, uncolored
  var am, amStorage

  var seedHex = '00000000000000000000000000000000'
  var masterKeyBase58 = 'xprv9s21ZrQH143K2JbpEjGU94NcdKSASB7LuXvJCTsxuENcGN1nVG7QjMnBZ6zZNcJaiJogsRaLaYFFjs48qt4Fg7y1GnmrchQt1zFNu6QVnta'
  var address0 = '18KMigSHDPVFzsgWe1mcaPPA5wSY3Ur5wS'

  beforeEach(function() {
    cdStorage = new cclib.storage.ColorDefinitionStorage()
    cdManager = new cclib.color.ColorDefinitionManager(cdStorage)
    uncolored = cdManager.getUncolored()
    amStorage = new storage.AddressStorage()
    am = new AddressManager(amStorage)
  })

  afterEach(function() {
    cdStorage.clear()
    amStorage.clear()
  })

  describe('setMasterKeyFromSeed', function() {
    it('from Buffer', function() {
      am.setMasterKeyFromSeed(new Buffer(seedHex, 'hex'), networks.bitcoin)
      var masterKey = am.getMasterKey()
      expect(masterKey).to.equal(masterKeyBase58)
    })

    it('from Hex string', function() {
      am.setMasterKeyFromSeed(seedHex, networks.bitcoin)
      var masterKey = am.getMasterKey()
      expect(masterKey).to.equal(masterKeyBase58)
    })
  })

  describe('getSomeAddress', function() {
    beforeEach(function() {
      am.setMasterKey(masterKeyBase58)
    })

    it('masterKey not defined', function() {
      am.getMasterKey = function() { return null }
      var fn = function() { am.getSomeAddress(uncolored) }
      expect(fn).to.throw(Error)
    })

    it('return new address', function() {
      var address = am.getSomeAddress(uncolored)
      expect(address.getAddress()).to.equal(address0)
    })

    it('return exist address', function() {
      var newAddress = am.getNewAddress(uncolored)
      var address = am.getSomeAddress(uncolored)
      expect(address.getAddress()).to.equal(newAddress.getAddress())
    })
  })

  describe('getNewAddress', function() {
    beforeEach(function() {
      am.setMasterKey(masterKeyBase58)
    })

    it('masterKey not defined', function() {
      am.getMasterKey = function() { return null }
      var fn = function() { am.getNewAddress(uncolored) }
      expect(fn).to.throw(Error)
    })

    it('addPubKey throw error', function() {
      am.getNewAddress(uncolored)
      var pubKeyHex = am.getNewAddress(uncolored).pubKey.toHex()
      am.amStorage.store.set(am.amStorage.pubKeysDBKey, []) // not good
      am.amStorage.addPubKey({ chain: 0, index: 0, pubKey: pubKeyHex })
      var fn = function() { am.getNewAddress(uncolored) }
      expect(fn).to.throw(Error)
    })

    it('getNewAddress once', function() {
      var newAddress = am.getNewAddress(uncolored)
      expect(newAddress.getAddress()).to.equal(address0)
    })
  })

  describe('getAllAddresses', function() {
    beforeEach(function() {
      am.setMasterKey(masterKeyBase58)
    })

    it('masterKey not defined', function() {
      am.getMasterKey = function() { return null }
      var fn = function() { am.getAllAddresses(uncolored) }
      expect(fn).to.throw(Error)
    })

    it('getAllAddresses once', function() {
      var address0 = am.getNewAddress(uncolored).getAddress()
      var addresses = am.getAllAddresses(uncolored).map(function(address) { return address.getAddress() })
      expect(addresses).to.deep.equal([address0])
    })
  })
})
