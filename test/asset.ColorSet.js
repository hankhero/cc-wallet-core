var expect = require('chai').expect

var cclib = require('coloredcoinjs-lib')

var ColorSet = require('../src/asset/ColorSet')


describe('asset.ColorSet', function() {
  var cdStorage, cdManager
  var colorSet

  beforeEach(function() {
    cdStorage = new cclib.storage.ColorDefinitionStorage()
    cdManager = new cclib.color.ColorDefinitionManager(cdStorage)
  })

  afterEach(function() {
    cdStorage.clear()
  })

  it('getColorHash', function() {
    colorSet = new ColorSet({
      colorDefinitionManager: cdManager,
      colorSchemeSet: ['', 'epobc:b95323a763fa507110a89ab857af8e949810cf1e67e91104cd64222a04ccd0bb:0:180679']
    })
    expect(colorSet.getColorHash()).to.equal('6xgXQgnviwX5Lk')
  })

  it('getColorIds', function() {
    colorSet = new ColorSet({ colorDefinitionManager: cdManager, colorSchemeSet: [''] })
    expect(colorSet.getColorIds()).to.deep.equal([0])
  })

  it('getData', function() {
    colorSet = new ColorSet({ colorDefinitionManager: cdManager, colorSchemeSet: [''] })
    expect(colorSet.getData()).to.deep.equal([''])
  })
})
