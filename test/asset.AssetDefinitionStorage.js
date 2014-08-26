var expect = require('chai').expect

var SyncStorage = require('../src/SyncStorage')
var AssetDefinitionStorage = require('../src/asset').AssetDefinitionStorage


describe('asset.AssetDefinitionStorage', function() {
  var storage

  beforeEach(function() {
    storage = new AssetDefinitionStorage()
    storage.add({
      ids: ['111', '123'],
      monikers: ['gold'],
      colorSchemes: ['scheme1', 'scheme2'],
      unit: 10
    })
  })

  afterEach(function() {
    storage.clear()
  })

  it('inherits SyncStorage', function() {
    expect(storage).to.be.instanceof(SyncStorage)
    expect(storage).to.be.instanceof(AssetDefinitionStorage)
  })

  it('add throw error, id already exist', function() {
    var data = {
      ids: ['113', '123'],
      monikers: ['silver'],
      colorSchemes: [''],
      unit: 1
    }
    var fn = function() { storage.add(data) }
    expect(fn).to.throw(Error)
  })

  it('add throw error, moniker already exist', function() {
    var data = {
      ids: ['113'],
      monikers: ['gold'],
      colorSchemes: [''],
      unit: 1
    }
    var fn = function() { storage.add(data) }
    expect(fn).to.throw(Error)
  })

  it('getByMoniker return null', function() {
    var result = storage.getByMoniker('bitcoin')
    expect(result).to.be.null
  })

  it('getByMoniker return object', function() {
    var result = storage.getByMoniker('gold')
    expect(result).to.be.instanceof(Object)
  })

  it('getAll', function() {
    var result = storage.getAll()
    expect(result).to.have.length(1)
    expect(result[0]).to.be.instanceof(Object)
  })
})
