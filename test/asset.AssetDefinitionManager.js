var expect = require('chai').expect

var cclib = require('coloredcoinjs-lib')

var AssetDefinition = require('../src/asset').AssetDefinition
var AssetDefinitionManager = require('../src/asset').AssetDefinitionManager
var storage = require('../src/storage')


describe('asset.AssetDefinitionManager', function() {
  var cdStorage, cdManager, adStorage, adManager

  beforeEach(function() {
    cdStorage = new cclib.storage.ColorDefinitionStorage()
    cdManager = new cclib.color.ColorDefinitionManager(cdStorage)
    adStorage = new storage.AssetDefinitionStorage()
    adManager = new AssetDefinitionManager(cdManager, adStorage)
  })

  afterEach(function() {
    cdStorage.clear()
    adStorage.clear()
  })

  it('create bitcoin AssetDefinition in constructor', function() {
    var assets = adManager.getAllAssets()
    expect(assets).to.have.length(1)
    expect(assets[0].getMonikers()).to.deep.equal(['bitcoin'])
  })

  it('bitcoin AssetDefinition alredy exists', function() {
    adManager = new AssetDefinitionManager(cdManager, adStorage)
    var assets = adManager.getAllAssets()
    expect(assets).to.have.length(1)
    expect(assets[0].getMonikers()).to.deep.equal(['bitcoin'])
  })

  it('createAssetDefinition/getAllAssets', function() {
    adManager.createAssetDefinition({
      monikers: ['gold'],
      colorSet: ['epobc:b95323a763fa507110a89ab857af8e949810cf1e67e91104cd64222a04ccd0bb:0:180679'],
      unit: 10000
    })
    var assets = adManager.getAllAssets()
    expect(assets).to.have.length(2)
  })

  it('getByMoniker return AssetDefinition', function() {
    var asset = adManager.getByMoniker('bitcoin')
    expect(asset).to.be.instanceof(AssetDefinition)
  })

  it('getByMoniker return null', function() {
    var asset = adManager.getByMoniker('bronze')
    expect(asset).to.be.null
  })
})
