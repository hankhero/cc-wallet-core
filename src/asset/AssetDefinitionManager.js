var AssetDefinition = require('./AssetDefinition')
var verify = require('../verify')


/**
 * @class AssetDefinitionManager
 *
 * @param {coloredcoinjs-lib.ColorDefinitionManager} cdManager
 * @param {AssetDefinitionStorage} storage
 */
function AssetDefinitionManager(cdManager, storage) {
  verify.ColorDefinitionManager(cdManager)
  verify.AssetDefinitionStorage(storage)

  this.cdManager = cdManager
  this.storage = storage

  if (this.storage.getByMoniker('bitcoin') === null) {
    var uncoloredColorDefinition = cdManager.getUncolored()

    this.createAssetDefinition({
      monikers: ['bitcoin'],
      colorDescs: [uncoloredColorDefinition.getDesc()],
      unit: 100000000
    })
  }
}

/**
 * @param {Object} data
 * @param {string[]} data.monikers
 * @param {string[]} data.colorDescs
 * @param {number} [data.unit=1]
 * @return {AssetDefinition}
 * @throws {Error} If data.id or monikers in data.monikers exists
 */
AssetDefinitionManager.prototype.createAssetDefinition = function(data) {
  //TODO: this is a hack, need deep comparison
  var assetdef = this.getByMoniker(data.monikers[0])
  if (assetdef !== null)
    return assetdef

/*
  var assetdefs = _.filter(data.monikers.map(this.getByMoniker.bind(this)))
  if (assetdefs.length > 1)
    throw new Error('Can\'t resolve by moniker')
  if (assetdefs.length > 0)
    return assetdefs[0]
*/

  assetdef = new AssetDefinition(this.cdManager, data)

  this.storage.add({
    id: assetdef.getId(),
    monikers: assetdef.getMonikers(),
    colorDescs: assetdef.getColorSet().getColorDescs(),
    unit: assetdef.getData().unit
  })

  return assetdef
}

/**
 * @param {string} moniker
 * @return {?AssetDefinition}
 */
AssetDefinitionManager.prototype.getByMoniker = function(moniker) {
  verify.string(moniker)

  var result = this.storage.getByMoniker(moniker)

  if (result !== null)
    result = new AssetDefinition(this.cdManager, result)

  return result
}

/**
 * @param {string} desc
 * @return {?AssetDefinition}
 */
AssetDefinitionManager.prototype.getByDesc = function(desc) {
  verify.string(desc)

  var result = this.storage.getByDesc(desc)

  if (result !== null)
    result = new AssetDefinition(this.cdManager, result)

  return result
}

/**
 * @return {AssetDefinition[]}
 */
AssetDefinitionManager.prototype.getAllAssets = function() {
  var assetdefs = this.storage.getAll().map(function(record) {
    return new AssetDefinition(this.cdManager, record)
  }.bind(this))

  return assetdefs
}


module.exports = AssetDefinitionManager
