var AssetDefinition = require('./AssetDefinition')


/**
 * @class AssetDefinitionManager
 *
 * @param {coloredcoinjs-lib.color.ColorDefinitionManager} cdManager
 * @param {AssetDefinitionStorage} storage
 */
function AssetDefinitionManager(cdManager, storage) {
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
  if (assetdef)
    return assetdef

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
