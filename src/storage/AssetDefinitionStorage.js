var assert = require('assert')
var inherits = require('util').inherits

var _ = require('lodash')

var SyncStorage = require('./SyncStorage')


/**
 * @typedef {Object} AssetDefinitionRecord
 * @param {string} id
 * @param {string[]} monikers
 * @param {string[]} colorSchemes
 * @param {number} unit
 */

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
 * @param {AssetDefinitionRecord} data
 * @throws {?Error} If data.id or moniker from data.monikers already exists
 */
AssetDefinitionStorage.prototype.add = function(data) {
  var records = this.store.get(this.assetDefinitionsDBKey) || []
  records.forEach(function(record) {
    if (record.id === data.id)
      throw new Error('exists asset already have same id')

    var someMoniker = data.monikers.some(function(moniker) { return record.monikers.indexOf(moniker) !== -1 })
    if (someMoniker)
      throw new Error('exists asset already have same moniker')

    var someColorScheme = data.colorSchemes.some(function(cs) { return record.colorSchemes.indexOf(cs) !== -1 })
    if (someColorScheme)
      throw new Error('exists asset already have same colorScheme')
  })

  records.push({
    id: data.id,
    monikers: data.monikers,
    colorSchemes: data.colorSchemes,
    unit: data.unit
  })

  this.store.set(this.assetDefinitionsDBKey, records)
}

/**
 * @param {string} moniker
 * @return {?AssetDefinitionRecord}
 */
AssetDefinitionStorage.prototype.getByMoniker = function(moniker) {
  var records = this.getAll().filter(function(record) {
    return (record.monikers.indexOf(moniker) !== -1)
  })

  if (records.length === 0)
    return null

  return records[0]
}

/*
 * @return {AssetDefinitionRecord[]}
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
