/**
 * @class AssetTarget
 *
 * As ColorTarget, just for asset
 *
 * @param {AssetDefinition} assetdef
 * @param {number} value
 */
function AssetTarget(address, assetValue) {
  this.address = address
  this.assetValue = assetValue
}

/**
 * Return target address
 *
 * @return {string}
 */
AssetTarget.prototype.getAddress = function() {
  return this.address
}

/**
 * Return AssetValue of current assetTarget
 *
 * @return {AssetValue}
 */
AssetTarget.prototype.getAssetValue = function() {
  return this.assetValue
}

/**
 * Return AssetDefinition of current assetTarget
 *
 * @return {AssetDefinition}
 */
AssetTarget.prototype.getAsset = function() {
  return this.getAssetValue().getAsset()
}

/**
 * Return value in satoshi
 *
 * @return {number}
 */
AssetTarget.prototype.getValue = function() {
  return this.getAssetValue().getValue()
}


module.exports = AssetTarget
