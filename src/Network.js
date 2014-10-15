var events = require('events')
var inherits = require('util').inherits

var bitcoin = require('coloredcoinjs-lib').bitcoin
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
    if (deferred instanceof Q.defer) {
      if (response.error)
        deferred.reject(response.error)
      else
        deferred.resolve(response.result)

      delete self._requests[response.id]
    }
  })

  self.request('blockchain.numblocks.subscribe').then(function(height) {
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
 * @param {Q.Promise} address
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
 * @return {Q.Promise}
 */
Network.prototype.getHeader = function(height) {
  return this.request('blockchain.block.get_header', [height])
}

/**
 * @param {number} index
 * @return {Q.Promise}
 */
Network.prototype.getChunk = function(index) {
  return this.request('blockchain.block.get_chunk', [index])
}

/**
 * @param {string} txId
 * @return {Q.Promise}
 */
Network.prototype.getTx = function(txId) {
  return this.request('blockchain.transaction.get', [txId]).then(function(rawTx) {
    return bitcoin.Transaction.fromHex(rawTx)
  })
}

/**
 * @param {string} txId
 * @param {number} height
 * @return {Q.Promise}
 */
Network.prototype.getMerkle = function(txId, height) {
  return this.request('blockchain.transaction.get_merkle', [txId, height])
}

/**
 * @param {bitcoin.Transaction} tx
 * @return {Q.Promise}
 */
Network.prototype.sendTx = function(tx) {
  return this.request('blockchain.transaction.broadcast', [tx.toHex()])
}

/**
 * @param {string} address
 * @return {Q.Promise}
 */
Network.prototype.getUTXO = function(address) {
  return this.request('blockchain.address.listunspent', [address])
}

/**
 * @param {string} address
 * @return {Q.Promise}
 */
Network.prototype.getHistory = function(address) {
  return this.request('blockchain.address.get_history', [address])
}


module.exports = Network
