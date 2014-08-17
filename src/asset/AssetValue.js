/**
 * @class AssetValue
 *
 * As ColorValue, just for asset
 *
 * @param {AssetDefinition} assetdef
 * @param {number} value
 */
function AssetValue(assetdef, value) {
  this.assetdef = assetdef
  this.value = value
}

/**
 * Return AssetDefinition of current assetValue
 *
 * @return {AssetDefinition}
 */
AssetValue.prototype.getAsset = function() {
  return this.assetdef
}

/**
 * Return value in satoshi
 *
 * @return {number}
 */
AssetValue.prototype.getValue = function() {
  return this.value
}


module.exports = AssetValue
