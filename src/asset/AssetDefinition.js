var assert = require('assert')

var _ = require('lodash')
var cclib = require('coloredcoinjs-lib')


/**
 * @class AssetDefinition

 * @param {coloredcoinjs-lib.color.ColorDefinitionManager} colorDefinitionManager
 * @param {Object} data
 * @param {Array} data.monikers
 * @param {Array} data.colorSet
 * @param {number} [data.unit=1] Power of 10 and greater than 0
 */
function AssetDefinition(colorDefinitionManager, data) {
  assert(colorDefinitionManager instanceof cclib.color.ColorDefinitionManager,
    'Expected ColorDefinitionManager colorDefinitionManager, got ' + colorDefinitionManager)

  assert(_.isObject(data), 'Expected Object data, got ' + data)
  assert(_.isArray(data.monikers), 'Expected Array data.monikers, got ' + data.monikers)
  data.monikers.forEach(function(moniker) {
    assert(_.isString(moniker), 'Expected Array strings data.monikers, got ' + data.monikers)
  })
  assert(_.isArray(data.colorSet), 'Expected Array data.colorSet, got ' + data.colorSet)
  data.colorSet.forEach(function(color) {
    assert(_.isString(color), 'Expected Array strings data.colorSet, got ' + data.colorSet)
  })
  if (_.isUndefined(data.unit)) data.unit = 1
  assert(_.isNumber(data.unit), 'Expected number data.unit, got ' + data.unit)

  if (Math.log(data.unit) / Math.LN10 % 1 !== 0)
    return new Error('data.unit must be power of 10 and greater than 0')

  assert(data.colorSet.length === 1, 'Currently only single-color assets are supported')

  this.monikers = data.monikers
  this.colorSet = new cclib.color.ColorSet(colorDefinitionManager, data.colorSet)
  this.unit = data.unit
}

/**
 * @return {Object}
 */
AssetDefinition.prototype.getData = function() {
  // Todo: replace to colorSet.getColorSchemes
  return {
    monikers: this.monikers,
    colorSet: this.colorSet.getData(),
    unit: this.unit
  }
}

/**
 * @return {string}
 */
AssetDefinition.prototype.getId = function() {
  return this.colorSet.getColorHash()
}

/**
 * @deprecated Not need, getId enough
 * @return {Array}
 */
AssetDefinition.prototype.getIds = function() {
  return [this.getId()]
}

/**
 * @return {Array}
 */
AssetDefinition.prototype.getMonikers = function() {
  return this.monikers
}

/**
 * @return {ColorSet}
 */
AssetDefinition.prototype.getColorSet = function() {
  return this.colorSet
}

/**
 * @param {string} portion
 * @return {number}
 */
AssetDefinition.prototype.parseValue = function(portion) {
  assert(_.isString(portion), 'Expected string portion, got ' + portion)

  var items = portion.split('.')
  var value = parseInt(items[0]) * this.unit + parseInt(items[1])

  return value
}

/**
 * @param {number} value
 * @return {string}
 */
AssetDefinition.prototype.formatValue = function(value) {
  assert(_.isNumber(value), 'Expected number value, got ' + value)

  var centString = (value % this.unit).toString()
  var centLength = this.unit.toString().length - 1
  while (centString.length < centLength)
    centString = '0' + centString

  return ~~(value/this.unit) + '.' + centString
}


module.exports = AssetDefinition
