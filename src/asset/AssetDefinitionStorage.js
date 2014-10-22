var inherits = require('util').inherits

var _ = require('lodash')

var SyncStorage = require('../SyncStorage')
var verify = require('../verify')


/**
 * @typedef {Object} AssetDefinitionRecord
 * @param {string} id
 * @param {string[]} monikers
 * @param {string[]} colorDescs
 * @param {number} unit
 */

/**
 * @class AssetDefinitionStorage
 * @extends SyncStorage
 */
function AssetDefinitionStorage() {
  SyncStorage.apply(this, Array.prototype.slice.call(arguments))

  this.dbKey = this.globalPrefix + 'AssetDefinitions'

  if (!_.isObject(this.store.get(this.dbKey)))
    this.store.set(this.dbKey, [])
}

inherits(AssetDefinitionStorage, SyncStorage)

/**
 * @param {AssetDefinitionRecord} data
 * @throws {?Error} If data.id or moniker from data.monikers already exists
 */
AssetDefinitionStorage.prototype.add = function(data) {
  verify.object(data)
  verify.string(data.id)
  verify.array(data.monikers)
  data.monikers.forEach(verify.string)
  verify.array(data.colorDescs)
  data.colorDescs.forEach(verify.string)
  verify.number(data.unit)

  var records = this.store.get(this.dbKey) || []
  records.forEach(function(record) {
    if (record.id === data.id)
      throw new Error('exists asset already have same id')

    var someMoniker = data.monikers.some(function(moniker) { return record.monikers.indexOf(moniker) !== -1 })
    if (someMoniker)
      throw new Error('exists asset already have same moniker')

    var someColorDesc = data.colorDescs.some(function(cs) { return record.colorDescs.indexOf(cs) !== -1 })
    if (someColorDesc)
      throw new Error('exists asset already have same colorDesc')
  })

  records.push({
    id: data.id,
    monikers: data.monikers,
    colorDescs: data.colorDescs,
    unit: data.unit
  })

  this.store.set(this.dbKey, records)
}

/**
 * @param {string} moniker
 * @return {?AssetDefinitionRecord}
 */
AssetDefinitionStorage.prototype.getByMoniker = function(moniker) {
  verify.string(moniker)

  var records = this.getAll().filter(function(record) {
    return (record.monikers.indexOf(moniker) !== -1)
  })

  if (records.length === 0)
    return null

  return records[0]
}

/**
 * @param {string} desc
 * @return {?AssetDefinitionRecord}
 */
AssetDefinitionStorage.prototype.getByDesc = function(desc) {
  verify.string(desc)

  var records = this.getAll().filter(function(record) {
    return (record.colorDescs.indexOf(desc) !== -1)
  })

  if (records.length === 0)
    return null

  return records[0]
}

/*
 * @return {AssetDefinitionRecord[]}
 */
AssetDefinitionStorage.prototype.getAll  =function() {
  var records = this.store.get(this.dbKey) || []
  return records
}

/**
 * Drop all asset definions
 */
AssetDefinitionStorage.prototype.clear = function() {
  this.store.remove(this.dbKey)
}


module.exports = AssetDefinitionStorage
