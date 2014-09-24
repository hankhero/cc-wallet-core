var events = require('events')
var inherits = require('util').inherits

var _ = require('lodash')
var Q = require('q')
var socket = require('socket.io-client')


/**
 * @event Network#connect
 */

/**
 * @event Network#connect_error
 * @type {Object}
 */

/**
 * @event Network#reconnecting
 */

/**
 * @event Network#disconnect
 */

/**
 * @event Network#newHeight
 * @type {number}
 */

/**
 * @event Network#touchedAddress
 * @type {string}
 */

/**
 * @class Network
 * @param {Object} opts
 * @param {string} opts.host
 * @param {number} [opts.port=8783]
 * @param {boolean} [opts.secure=false]
 */
function Network(opts) {
  events.EventEmitter.call(this)

  this._isInialized = false
  this._isConnected = false
  this._requestId = 0
  this._requests = {}

  opts = _.extend({
    port: 8783,
    secure: false
  }, opts)

  this.url = [
    opts.secure ? 'https://' : 'http://',
    opts.host,
    ':',
    opts.port
  ].join('')
}

inherits(Network, events.EventEmitter)

// Todo
/*
 * @param {testnet} [boolean=false]
 * @return {?[]}
 */
Network.getDefaultServers = function() { return [] }

/**
 */
Network.prototype.initialize = function() {
  var self = this
  if (self._isInialized)
    return

  self._isInialized = true

  self.socket = socket(self.url, { forceNew: true })

  self.socket.on('connect', function() {
    if (!self._isConnected)
      self._isConnected = true

    self.emit('connect')
  })

  self.socket.on('connect_error', function(error) {
    self.emit('connect_error', error)
  })

  self.socket.on('reconnecting', function() {
    self.emit('reconnecting')
  })

  self.socket.on('disconnect', function() {
    self.emit('disconnect')
  })

  self.socket.on('message', function(response) {
    try {
      response = JSON.parse(response)

    } catch(error) {
      return

    }

    if (response.id === null) {
      if (response.method === 'blockchain.numblocks.subscribe') {
        self.currentHeight = response.result
        self.emit('newHeight', response.result)
        return
      }

      if (response.method === 'blockchain.address.subscribe') {
        if (_.isArray(response.result))
          self.emit('touchedAddress', response.result[0])
        return
      }
    }

    var deferred = self._requests[response.id]
    if (deferred instanceof Q.defer)
      deferred.resolve(response.result)
  })

  self.request('blockchain.numblocks.subscribe', []).then(function(height) {
    self.currentHeight = height
    self.emit('newHeight', self.currentHeight)
  })
}

/**
 */
Network.prototype.disconnect = function() {
  this.socket.disconnect()
}

/**
 * @param {string} method
 * @param {*[]} [params]
 * @return {Q.Promise}
 */
Network.prototype.request = function(method, params) {
  // Todo: add timeout? Q.delay(timeout).then(function(){ deferred.reject(new Error('Timeout')) })
  var deferred = Q.defer()

  var request = { id: this._requestId++, method: method, params: params || [] }
  this._requests[request.id] = deferred

  this.socket.send(JSON.stringify(request))

  return deferred.promise
}

/**
 * @param {string} address
 */
Network.prototype.addressSubscribe = function(address) {
  var deferred = Q.defer()

  this.request('blockchain.address.subscribe', [address])
    .done(function() { deferred.resolve() }, deferred.reject)

  return deferred.promise
}

/**
 * @return {number}
 */
Network.prototype.getCurrentHeight = function() {
  return this.currentHeight
}

/**
 * @param {number} height
 * @return {string}
 */
Network.prototype.getHeader = function() {}

/**
 * @param {number} index
 * @return {string}
 */
Network.prototype.getChunk = function() {}


module.exports = Network
