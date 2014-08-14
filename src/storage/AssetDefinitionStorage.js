var assert = require('assert')
var inherits = require('util').inherits

var _ = require('lodash')

var SyncStorage = require('./SyncStorage')

/**
 * @class AssetDefinitionStorage
 *
 * Inherits SyncStorage
 */
function AssetDefinitionStorage() {
  SyncStorage.apply(this, Array.prototype.slice.call(arguments))

  this.assetDefinitionsDBKey = this.globalPrefix + 'AssetDefinitions'

  if (!_.isObject(this.store.get(this.assetDefinitionsDBKey)))
    this.store.set(this.assetDefinitionsDBKey, [])
}

inherits(AssetDefinitionStorage, SyncStorage)

/**
 *
 * @param {Object} data
 * @param {Array} data.ids
 * @param {Array} data.monikers
 * @param {Array} data.colorSet
 * @param {number} data.unit
 * @return {null|Error}
 */
AssetDefinitionStorage.prototype.add = function(data) {
  assert(_.isObject(data), 'Expected Object data, got ' + data)
  assert(_.isArray(data.ids), 'Expected Array data.ids, got ' + data.ids)
  data.ids.forEach(function(id) {
    assert(_.isString(id), 'Expected Array strings data.ids, got ' + data.ids)
  })
  assert(_.isArray(data.monikers), 'Expected Array data.monikers, got ' + data.monikers)
  data.monikers.forEach(function(moniker) {
    assert(_.isString(moniker), 'Expected Array strings data.monikers, got ' + data.monikers)
  })
  assert(_.isArray(data.colorSet), 'Expected Array data.colorSet, got ' + data.colorSet)
  data.colorSet.forEach(function(color) {
    assert(_.isString(color), 'Expected Array strings data.colorSet, got ' + data.colorSet)
  })
  assert(_.isNumber(data.unit), 'Expected number data.unit, got ' + data.unit)

  var error = null

  var records = this.store.get(this.assetDefinitionsDBKey) || []
  records.some(function(record) {
    var someId = data.ids.some(function(id) { return (record.ids.indexOf(id) !== -1) })
    if (someId)
      error = new Error('exists asset already have same id')

    var someMoniker = data.monikers.some(function(moniker) { return (record.monikers.indexOf(moniker) !== -1) })
    if (someMoniker)
      error = new Error('exists asset already have same moniker')

    return (someId || someMoniker)
  })

  if (error !== null)
    return error

  records.push({
    ids: data.ids,
    monikers: data.monikers,
    colorSet: data.colorSet,
    unit: data.unit
  })

  this.store.set(this.assetDefinitionsDBKey, records)

  return null
}

/**
 * @param {string} moniker
 * @return {Object|null}
 */
AssetDefinitionStorage.prototype.getByMoniker = function(moniker) {
  assert(_.isString(moniker), 'Expected string moniker, got ' + moniker)

  var result = null

  var records = this.store.get(this.assetDefinitionsDBKey) || []
  records.some(function(record) {
    if (record.monikers.indexOf(moniker) !== -1) {
      result = record
      return true
    }

    return false
  })

  return result
}

/*
 * @return {Array}
 */
AssetDefinitionStorage.prototype.getAll  =function() {
  var records = this.store.get(this.assetDefinitionsDBKey) || []
  return records
}

/**
 * Drop all asset definions
 */
AssetDefinitionStorage.prototype.clear = function() {
  this.store.remove(this.assetDefinitionsDBKey)
}


module.exports = AssetDefinitionStorage
