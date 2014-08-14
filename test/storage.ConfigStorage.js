var expect = require('chai').expect

var storage = require('../src/storage')
var SyncStorage = require('../src/storage/SyncStorage')


describe('storage.ConfigStorage', function() {
  var cStorage

  beforeEach(function() {
    cStorage = new storage.ConfigStorage()
  })

  afterEach(function() {
    cStorage.clear()
  })

  it('inherits SyncStorage', function() {
    expect(cStorage).to.be.instanceof(SyncStorage)
    expect(cStorage).to.be.instanceof(storage.ConfigStorage)
  })

  it('set/get', function() {
    cStorage.set('key', 'myValue!!1')
    expect(cStorage.get('key')).to.equal('myValue!!1')
  })

  it('get defaultValue', function() {
    expect(cStorage.get('key', 'myDefaultValye')).to.equal('myDefaultValye')
  })
})
