/**
 * @class AssetTarget
 *
 * As ColorTarget, just for asset
 *
 * @param {Buffer} address
 * @param {AssetValue} assetValue
 */
function AssetTarget(script, assetValue) {
  this.script = script
  this.assetValue = assetValue
}

/**
 * @return {Buffer}
 */
AssetTarget.prototype.getScript = function() {
  return this.script
}

/**
 * @return {AssetValue}
 */
AssetTarget.prototype.getAssetValue = function() {
  return this.assetValue
}

/**
 * @return {AssetDefinition}
 */
AssetTarget.prototype.getAsset = function() {
  return this.getAssetValue().getAsset()
}

/**
 * @return {number}
 */
AssetTarget.prototype.getValue = function() {
  return this.getAssetValue().getValue()
}


module.exports = AssetTarget
