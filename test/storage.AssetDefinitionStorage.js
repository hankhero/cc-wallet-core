var expect = require('chai').expect

var storage = require('../src/storage')
var SyncStorage = require('../src/storage/SyncStorage')


describe('storage.AssetDefinitionStorage', function() {
  var adStorage

  beforeEach(function() {
    adStorage = new storage.AssetDefinitionStorage()
    adStorage.add({
      ids: ['111', '123'],
      monikers: ['gold'],
      colorSchemes: ['scheme1', 'scheme2'],
      unit: 10
    })
  })

  afterEach(function() {
    adStorage.clear()
  })

  it('inherits SyncStorage', function() {
    expect(adStorage).to.be.instanceof(SyncStorage)
    expect(adStorage).to.be.instanceof(storage.AssetDefinitionStorage)
  })

  it('add throw error, id already exist', function() {
    var data = {
      ids: ['113', '123'],
      monikers: ['silver'],
      colorSchemes: [''],
      unit: 1
    }
    var fn = function() { adStorage.add(data) }
    expect(fn).to.throw(Error)
  })

  it('add throw error, moniker already exist', function() {
    var data = {
      ids: ['113'],
      monikers: ['gold'],
      colorSchemes: [''],
      unit: 1
    }
    var fn = function() { adStorage.add(data) }
    expect(fn).to.throw(Error)
  })

  it('getByMoniker return null', function() {
    var result = adStorage.getByMoniker('bitcoin')
    expect(result).to.be.null
  })

  it('getByMoniker return object', function() {
    var result = adStorage.getByMoniker('gold')
    expect(result).to.be.instanceof(Object)
  })

  it('getAll', function() {
    var result = adStorage.getAll()
    expect(result).to.have.length(1)
    expect(result[0]).to.be.instanceof(Object)
  })
})
