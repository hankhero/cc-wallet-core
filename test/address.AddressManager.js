var expect = require('chai').expect

var bitcoin = require('bitcoinjs-lib')
var networks = bitcoin.networks

var AddressManager = require('../src/address').AddressManager
var storage = require('../src/storage')


describe('AddressManager', function() {
  var am, amStorage

  var seedHex = '00000000000000000000000000000000'
  var masterKeyBase58 = 'xprv9s21ZrQH143K2JbpEjGU94NcdKSASB7LuXvJCTsxuENcGN1nVG7QjMnBZ6zZNcJaiJogsRaLaYFFjs48qt4Fg7y1GnmrchQt1zFNu6QVnta'
  var address0 = '18KMigSHDPVFzsgWe1mcaPPA5wSY3Ur5wS'

  beforeEach(function() {
    amStorage = new storage.AddressStorage()
    am = new AddressManager(amStorage)
  })

  afterEach(function() {
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

    it('masterKey is undefined', function() {
      am.getMasterKey = function() { return undefined }
      var fn = function() { am.getSomeAddress({ account: 0, chain: 0 }) }
      expect(fn).to.throw(Error)
    })

    it('return new address', function() {
      var address = am.getSomeAddress({ account: 0, chain: 0 })
      expect(address.getAddress()).to.equal(address0)
    })

    it('return exist address', function() {
      var newAddress = am.getNewAddress({ account: 0, chain: 0 })
      var address = am.getSomeAddress({ account: 0, chain: 0 })
      expect(address.getAddress()).to.equal(newAddress.getAddress())
    })
  })

  describe('getNewAddress', function() {
    beforeEach(function() {
      am.setMasterKey(masterKeyBase58)
    })

    it('masterKey is undefined', function() {
      am.getMasterKey = function() { return undefined }
      var fn = function() { am.getNewAddress({ account: 0, chain: 0 }) }
      expect(fn).to.throw(Error)
    })

    it('addPubKey throw error', function() {
      am.getNewAddress({ account: 0, chain: 0 })
      var pubKeyHex = am.getNewAddress({ account: 0, chain: 0 }).pubKey.toHex()
      am.amStorage.store.set(am.amStorage.pubKeysDBKey, []) // not good
      am.amStorage.addPubKey({ account: 0, chain: 0, index: 0, pubKey: pubKeyHex })
      var fn = function() { am.getNewAddress({ account: 0, chain: 0 }) }
      expect(fn).to.throw(Error)
    })

    it('getNewAddress once', function() {
      var newAddress = am.getNewAddress({ account: 0, chain: 0 })
      expect(newAddress.getAddress()).to.equal(address0)
    })
  })

  describe('getAllAddresses', function() {
    beforeEach(function() {
      am.setMasterKey(masterKeyBase58)
    })

    it('masterKey is undefined', function() {
      am.getMasterKey = function() { return undefined }
      var fn = function() { am.getAllAddresses({ account: 0, chain: 0 }) }
      expect(fn).to.throw(Error)
    })

    it('getAllAddresses once', function() {
      var address0 = am.getNewAddress({ account: 0, chain: 0 }).getAddress()
      var addresses = am.getAllAddresses({ account: 0, chain: 0 }).map(function(address) { return address.getAddress() })
      expect(addresses).to.deep.equal([address0])
    })
  })
})
