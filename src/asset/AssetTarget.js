/**
 * @class AssetTarget
 *
 * As ColorTarget, just for asset
 *
 * @param {string} address
 * @param {AssetValue} assetValue
 */
function AssetTarget(address, assetValue) {
  this.address = address
  this.assetValue = assetValue
}

/**
 * @return {string}
 */
AssetTarget.prototype.getAddress = function() {
  return this.address
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
