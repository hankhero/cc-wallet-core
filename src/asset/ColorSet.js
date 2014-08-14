var assert = require('assert')
var crypto = require('crypto')

var base58 = require('bs58')
var _ = require('lodash')
var ColorDefinitionManager = require('coloredcoinjs-lib').color.ColorDefinitionManager


/**
 * @class ColorSet
 *
 * @param {Object} params
 * @param {coloredcoinjs-lib.color.ColorDefinitionManager} params.colorDefinitionManager
 * @param {Array} params.colorSchemeSet
 */
function ColorSet(params) {
  assert(_.isObject(params), 'Expected Object params, got ' + params)
  assert(params.colorDefinitionManager instanceof ColorDefinitionManager,
    'Expected ColorDefinitionManager params.colorDefinitionManager, got ' + params.colorDefinitionManager)
  assert(_.isArray(params.colorSchemeSet), 'Expected Array params.colorSchemeSet, got ' + params.colorSchemeSet)
  params.colorSchemeSet.forEach(function(color) {
    assert(_.isString(color), 'Expected Array strings params.colorSchemeSet, got ' + params.colorSchemeSet)
  })

  this.colorSchemeSet = params.colorSchemeSet

  this.colorIdSet = []
  this.colorSchemeSet.forEach(function(colorScheme) {
    var colorDef = params.colorDefinitionManager.resolveByScheme({ scheme: colorScheme })
    this.colorIdSet.push(colorDef.getColorId())
  }.bind(this))
}

/**
 * @return {boolean}
 */
ColorSet.prototype.isUncoloredOnly = function() {
  return this.colorSchemeSet.every(function(scheme) { return scheme === '' })
}

/**
 * @return {boolean}
 */
ColorSet.prototype.isEPOBCOnly = function() {
  return this.colorSchemeSet.every(function(scheme) { return scheme.indexOf('epobc') === 0 })
}

/**
 * @return {string}
 */
ColorSet.prototype.getColorHash = function() {
  // for compact replace ', ' to ',' as in ngcccbase
  var json = JSON.stringify(this.colorSchemeSet.slice(0).sort()).replace(', ', ',')
  var hash = crypto.createHash('sha256').update(json).digest().slice(0, 10)
  return base58.encode(hash)
}

/**
 * @return {Array}
 */
ColorSet.prototype.getColorSchemes = function() {
  return this.colorSchemeSet
}

/**
 * @return {Array}
 */
ColorSet.prototype.getColorIds = function() {
  return this.colorIdSet
}

/**
 * @return {Array}
 */
ColorSet.prototype.getData = function() {
  return this.colorSchemeSet
}


module.exports = ColorSet
