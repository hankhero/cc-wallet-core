var assert = require('assert')
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

  this.configDBKey = this.globalPrefix + 'config'

  if (!_.isObject(this.store.get(this.configDBKey)))
    this.store.set(this.configDBKey, {})
}

inherits(ConfigStorage, SyncStorage)

/**
 * Set key
 *
 * @param {string} key
 * @param {} value
 */
ConfigStorage.prototype.set = function(key, value) {
  assert(_.isString(key), 'Expected String key, got ' + key)

  var config = this.store.get(this.configDBKey) || {}

  config[key] = value

  this.store.set(this.configDBKey, config)
}

/**
 * Get key from store or defaultValue if value undefined
 *
 * @param {string} key
 * @param {} [defaultValue=undefined]
 * @return {}
 */
ConfigStorage.prototype.get = function(key, defaultValue) {
  var config = this.store.get(this.configDBKey) || {}
  var value = _.isUndefined(config[key]) ? defaultValue : config[key]
  return value
}

/**
 * Drop current config
 */
ConfigStorage.prototype.clear = function() {
  this.store.remove(this.configDBKey)
}


module.exports = ConfigStorage
