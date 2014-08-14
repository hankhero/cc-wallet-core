var expect = require('chai').expect

var cclib = require('coloredcoinjs-lib')

var SyncStorage = require('../src/storage/SyncStorage')


describe('storage.SyncStorage', function() {
  it('inherits coloredcoinjs-lib.storage.SyncStorage', function() {
    var storage = new SyncStorage()
    expect(storage).to.be.instanceof(SyncStorage)
    expect(storage).to.be.instanceof(cclib.storage.SyncStorage)
    expect(storage.store).not.to.be.undefined
  })
})
