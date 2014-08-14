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
      colorSet: ['scheme1', 'scheme2'],
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

  it('add return error, id already exist', function() {
    var result = adStorage.add({
      ids: ['113', '123'],
      monikers: ['silver'],
      colorSet: [''],
      unit: 1
    })
    expect(result).to.be.instanceof(Error)
  })

  it('add return error, moniker already exist', function() {
    var result = adStorage.add({
      ids: ['113'],
      monikers: ['gold'],
      colorSet: [''],
      unit: 1
    })
    expect(result).to.be.instanceof(Error)
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
