var assert = require('assert')

var _ = require('lodash')
var ColorDefinitionManager = require('coloredcoinjs-lib').color.ColorDefinitionManager

var AssetDefinition = require('./AssetDefinition')
var AssetDefinitionStorage = require('../storage').AssetDefinitionStorage


/**
 * @class AssetDefinitionManager
 *
 * @param {coloredcoinjs-lib.color.ColorDefinitionManager} cdManager
 * @param {AssetDefinitionStorage} adStorage
 */
function AssetDefinitionManager(cdManager, adStorage) {
  assert(cdManager instanceof ColorDefinitionManager,
    'Expected ColorDefinitionManager cdManager, got ' + cdManager)
  assert(adStorage instanceof AssetDefinitionStorage,
    'Expected AssetDefinitionStorage adStorage, got ' + adStorage)

  this.cdManager = cdManager
  this.adStorage = adStorage

  if (this.adStorage.getByMoniker('bitcoin') === null)
    this.createAssetDefinition({
      monikers: ['bitcoin'],
      colorSet: [''],
      unit: 100000000
    })
}

/**
 * Create new AssetDefinition and return it or Error
 *
 * @param {Object} data
 * @param {Array} data.monikers Asset names
 * @param {Array} data.colorSet Asset colors
 * @param {number} [data.unit=1] Asset unit
 * @return {AssetDefinition|Error}
 */
AssetDefinitionManager.prototype.createAssetDefinition = function(data) {
  // asserts for data in AssetDefinition
  var assdef = new AssetDefinition(this.cdManager, data)

  var error = this.adStorage.add({
    ids: assdef.getIds(),
    monikers: assdef.getData().monikers,
    colorSet: assdef.getData().colorSet,
    unit: assdef.getData().unit
  })

  return (error === null ? assdef : error)
}

/**
 * @param {string} moniker
 * @return {AssetDefinition|null}
 */
AssetDefinitionManager.prototype.getByMoniker = function(moniker) {
  assert(_.isString(moniker), 'Expected string moniker, got ' + moniker)

  var result = this.adStorage.getByMoniker(moniker)

  if (result !== null)
    result = new AssetDefinition(this.cdManager, result)

  return result
}

/**
 * @return {Array}
 */
AssetDefinitionManager.prototype.getAllAssets = function() {
  var assdefs = this.adStorage.getAll().map(function(record) {
    return new AssetDefinition(this.cdManager, record)
  }.bind(this))

  return assdefs
}


module.exports = AssetDefinitionManager
