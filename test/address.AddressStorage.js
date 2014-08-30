var expect = require('chai').expect

var SyncStorage = require('../src/SyncStorage')
var AddressStorage = require('../src/address/AddressStorage')


describe('address.AddressStorage', function() {
  var storage
  var masterKey1 = 'xprv9s21ZrQH143K2JF8RafpqtKiTbsbaxEeUaMnNHsm5o6wCW3z8ySyH4UxFVSfZ8n7ESu7fgir8imbZKLYVBxFPND1pniTZ81vKfd45EHKX73'
  var pubKeyHex1 = '021c10af30f8380f1ff05a02e10a69bd323a7305c43dc461f79c2b27c13532a12c'
  var pubKeyHex2 = '0375d65343d5dcf4527cf712168b41059cb1df513ba89b44108899835329eb643c'

  beforeEach(function() {
    storage = new AddressStorage()
  })

  afterEach(function() {
    storage.clear()
  })

  it('inherits SyncStorage', function() {
    expect(storage).to.be.instanceof(SyncStorage)
    expect(storage).to.be.instanceof(AddressStorage)
  })

  it('setMasterKey reset all records', function() {
    storage.addPubKey({ chain: 0, index: 0, pubKey: pubKeyHex1 })
    storage.setMasterKey(masterKey1)
    expect(storage.getPubKeys(0)).to.have.length(0)
  })

  it('getMasterKey return null', function() {
    expect(storage.getMasterKey()).to.be.null
  })

  it('getMasterKey', function() {
    storage.setMasterKey(masterKey1)
    expect(storage.getMasterKey()).to.equal(masterKey1)
  })

  it('addPubKey throw UniqueConstraint for account, chain and index', function() {
    storage.addPubKey({ chain: 0, index: 0, pubKey: pubKeyHex1 })
    var fn = function() { storage.addPubKey({ chain: 0, index: 0, pubKey: pubKeyHex2 }) }
    expect(fn).to.throw(Error)
  })

  it('addPubKey throw UniqueConstraint for pubKey', function() {
    storage.addPubKey({ chain: 0, index: 0, pubKey: pubKeyHex1 })
    var fn = function() { storage.addPubKey({ chain: 0, index: 1, pubKey: pubKeyHex1 }) }
    expect(fn).to.throw(Error)
  })

  it('getPubKeys', function() {
    storage.addPubKey({ chain: 0, index: 0, pubKey: pubKeyHex1 })
    storage.addPubKey({ chain: 1, index: 0, pubKey: pubKeyHex2 })
    var pubKeys = storage.getPubKeys(0)
    expect(pubKeys).to.deep.equal([{ account: 0, chain: 0, index: 0, pubKey: pubKeyHex1 }])
  })
})