var expect = require('chai').expect

var storage = require('../src/storage')
var SyncStorage = require('../src/storage/SyncStorage')


describe('storage.AddressStorage', function() {
  var aStorage
  var masterKey1 = 'xprv9s21ZrQH143K2JF8RafpqtKiTbsbaxEeUaMnNHsm5o6wCW3z8ySyH4UxFVSfZ8n7ESu7fgir8imbZKLYVBxFPND1pniTZ81vKfd45EHKX73'
  var pubKeyHex1 = '021c10af30f8380f1ff05a02e10a69bd323a7305c43dc461f79c2b27c13532a12c'
  var pubKeyHex2 = '0375d65343d5dcf4527cf712168b41059cb1df513ba89b44108899835329eb643c'

  beforeEach(function() {
    aStorage = new storage.AddressStorage()
  })

  afterEach(function() {
    aStorage.clear()
  })

  it('inherits SyncStorage', function() {
    expect(aStorage).to.be.instanceof(SyncStorage)
    expect(aStorage).to.be.instanceof(storage.AddressStorage)
  })

  it('setMasterKey reset all records', function() {
    aStorage.addPubKey({ account: 0, chain: 0, index: 0, pubKey: pubKeyHex1 })
    aStorage.setMasterKey(masterKey1)
    expect(aStorage.getAllPubKeys({ account: 0, chain: 0 })).to.have.length(0)
  })

  it('getMasterKey return null', function() {
    expect(aStorage.getMasterKey()).to.be.undefined
  })

  it('getMasterKey', function() {
    aStorage.setMasterKey(masterKey1)
    expect(aStorage.getMasterKey()).to.equal(masterKey1)
  })

  it('addPubKey throw UniqueConstraint for account, chain and index', function() {
    aStorage.addPubKey({ account: 0, chain: 0, index: 0, pubKey: pubKeyHex1 })
    var fn = function() { aStorage.addPubKey({ account: 0, chain: 0, index: 0, pubKey: pubKeyHex2 }) }
    expect(fn).to.throw(Error)
  })

  it('addPubKey throw UniqueConstraint for pubKey', function() {
    aStorage.addPubKey({ account: 0, chain: 0, index: 0, pubKey: pubKeyHex1 })
    var fn = function() { aStorage.addPubKey({ account: 1, chain: 0, index: 0, pubKey: pubKeyHex1 }) }
    expect(fn).to.throw(Error)
  })

  it('getAllPubKeys', function() {
    aStorage.addPubKey({ account: 0, chain: 0, index: 0, pubKey: pubKeyHex1 })
    aStorage.addPubKey({ account: 1, chain: 0, index: 0, pubKey: pubKeyHex2 })
    var pubKeys = aStorage.getAllPubKeys({ account: 0, chain: 0 })
    expect(pubKeys).to.deep.equal([{ account: 0, chain: 0, index: 0, pubKey: pubKeyHex1 }])
  })

  it('getMaxIndex for empty db', function() {
    var maxIndex = aStorage.getMaxIndex({ account: 0, chain: 0 })
    expect(maxIndex).to.be.undefined
  })

  it('getMaxIndex', function() {
    aStorage.addPubKey({ account: 0, chain: 0, index: 0, pubKey: pubKeyHex1 })
    aStorage.addPubKey({ account: 0, chain: 0, index: 3, pubKey: pubKeyHex2 })
    var maxIndex = aStorage.getMaxIndex({ account: 0, chain: 0 })
    expect(maxIndex).to.equal(3)
  })
})
