var assert = require('assert')

var _ = require('lodash')
var cclib = require('coloredcoinjs-lib')


/**
 * AssetDefinition description
 * @typedef {Object} AssetDefinitionDesc
 * @param {string[]} monikers
 * @param {string[]} colorSchemes
 * @param {number} [unit=1] Power of 10 and greater than 0
 */

/**
 * @class AssetDefinition

 * @param {coloredcoinjs-lib.color.ColorDefinitionManager} colorDefinitionManager
 * @param {AssetDefinitionDesc} data
 * @throws {Error} If data.unit not power of 10
 */
function AssetDefinition(colorDefinitionManager, data) {
  assert(data.colorSchemes.length === 1, 'Currently only single-color assets are supported')

  data.unit = _.isUndefined(data.unit) ? 1 : data.unit
  if (Math.log(data.unit) / Math.LN10 % 1 !== 0)
    throw new Error('data.unit must be power of 10 and greater than 0')

  this.monikers = data.monikers
  this.colorSet = new cclib.color.ColorSet(colorDefinitionManager, data.colorSchemes)
  this.unit = data.unit
}

/**
 * @return {AssetDefinitionDesc}
 */
AssetDefinition.prototype.getData = function() {
  return {
    monikers: this.monikers,
    colorSchemes: this.colorSet.getColorSchemes(),
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
 * @return {string[]}
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

  var value = parseInt(items[0]) * this.unit

  if (!_.isUndefined(items[1])) {
    var centString = items[1] + Array(this.unit.toString().length).join('0')
    var centValue = parseInt(centString.slice(0, this.unit.toString().length-1))

    if (!isNaN(centValue))
      value += centValue
  }

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
