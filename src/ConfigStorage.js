var inherits = require('util').inherits

var _ = require('lodash')

var SyncStorage = require('./SyncStorage')

/**
 * @class ConfigStorage
 *
 * Inherits SyncStorage
 */
function ConfigStorage() {
  SyncStorage.apply(this, Array.prototype.slice.call(arguments))

  this.dbKey = this.globalPrefix + 'config'

  if (!_.isObject(this.store.get(this.dbKey)))
    this.store.set(this.dbKey, {})
}

inherits(ConfigStorage, SyncStorage)

/**
 * Set key
 *
 * @param {string} key
 * @param {*} value
 */
ConfigStorage.prototype.set = function(key, value) {
  var config = this.store.get(this.dbKey) || {}
  config[key] = value
  this.store.set(this.dbKey, config)
}

/**
 * @param {string} key
 * @param {*} [defaultValue=undefined]
 * @return {*}
 */
ConfigStorage.prototype.get = function(key, defaultValue) {
  var config = this.store.get(this.dbKey) || {}
  var value = _.isUndefined(config[key]) ? defaultValue : config[key]
  return value
}

/**
 */
ConfigStorage.prototype.clear = function() {
  this.store.remove(this.dbKey)
}


module.exports = ConfigStorage
