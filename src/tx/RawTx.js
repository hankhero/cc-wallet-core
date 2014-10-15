var _ = require('lodash')
var Q = require('q')
var cclib = require('coloredcoinjs-lib')
var bitcoin = cclib.bitcoin


/**
 * @param {bitcoinjs-lib.Script} script
 * @param {Object} network
 * @param {number} network.pubKeyHash
 * @param {number} network.scriptHash
 * @return {string[]}
 */
function getAddressesFromOutputScript(script, network) {
  var addresses = []

  switch (bitcoin.scripts.classifyOutput(script)) {
    case 'pubkeyhash':
      addresses = [new bitcoin.Address(script.chunks[2], network.pubKeyHash)]
      break

    case 'pubkey':
      addresses = [bitcoin.ECPubKey.fromBuffer(script.chunks[0]).getAddress(network)]
      break

    case 'multisig':
      addresses = script.chunks.slice(1, -2).map(function(pubKey) {
        return bitcoin.ECPubKey.fromBuffer(pubKey).getAddress(network)
      })
      break

    case 'scripthash':
      addresses = [new bitcoin.Address(script.chunks[1], network.scriptHash)]
      break

    default:
      break
  }

  return addresses.map(function(addr) { return addr.toBase58Check() })
}


/**
 * @class RawTx
 */
function RawTx() {
  this.txb = new bitcoin.TransactionBuilder()
}

/**
 * @param {ComposedTx} composedTx
 * @return {RawTx}
 */
RawTx.fromComposedTx = function(composedTx) {
  var rawTx = new RawTx()

  composedTx.getTxIns().forEach(function(txIn) {
    // Todo: change coin to object with default sequence in cc-lib
    //var sequence = txIn.sequence || bitcoin.Transaction.DEFAULT_SEQUENCE
    rawTx.txb.addInput(txIn.txId, txIn.outIndex)//, sequence, txIn.script)
  })

  composedTx.getTxOuts().forEach(function(txOut) {
    rawTx.txb.addOutput(bitcoin.Script.fromBuffer(txOut.script), txOut.value)
  })

  return rawTx
}

/**
 * @param {bitcoinjs-lib.Transaction} tx
 * @return {RawTx}
 */
RawTx.fromTransaction = function(tx) {
  var rawTx = new RawTx()
  rawTx.txb = bitcoin.TransactionBuilder.fromTransaction(tx)

  return rawTx
}

/**
 * @param {string} hex
 * @return {RawTx}
 */
RawTx.fromHex = function(hex) {
  var tx = bitcoin.Transaction.fromHex(hex)
  return RawTx.fromTransaction(tx)
}

/**
 * @callback RawTx~sign
 * @param {?Error} error
 */

/**
 * @param {Wallet} opts.wallet
 * @param {(Buffer|seed)} opts.seed
 */
RawTx.prototype.sign = function(wallet, seed, cb) {
  var self = this
  var addressManager = wallet.getAddressManager()

  var promises = self.txb.tx.ins.map(function(input, index) {
    return Q.fcall(function() {
      if (!_.isUndefined(self.txb.prevOutScripts[index]))
        return

      var txId = Array.prototype.reverse.call(new Buffer(input.hash)).toString('hex')

      return Q.fcall(function() {
        return wallet.getTxDb().getTxById(txId)

      }).then(function(tx) {
        return tx !== null ? tx : Q.ninvoke(wallet.getBlockchain(), 'getTx', txId)

      }).then(function(tx) {
        self.txb.prevOutScripts[index] = tx.outs[input.index].script
        self.txb.prevOutTypes[index] = bitcoin.scripts.classifyOutput(self.txb.prevOutScripts[index])

      })

    }).then(function() {
      var addresses = getAddressesFromOutputScript(self.txb.prevOutScripts[index], wallet.getNetwork())
      addresses.forEach(function(address) {
        var privKey = addressManager.getPrivKeyByAddress(seed, address)
        self.txb.sign(index, privKey)
      })

    })
  })

  Q.all(promises).done(function() { cb(null) }, function(error) { cb(error) })
}

/**
 * @param {boolean} [allowIncomplete=fallse]
 * @return {bitcoinjs-lib.Transaction}
 */
RawTx.prototype.toTransaction = function(allowIncomplete) {
  allowIncomplete = allowIncomplete || false

  if (allowIncomplete)
    return this.txb.buildIncomplete()

  return this.txb.build()
}

/**
 * @param {boolean} [allowIncomplete=false]
 * @return {string}
 */
RawTx.prototype.toHex = function(allowIncomplete) {
  return this.toTransaction(allowIncomplete).toHex()
}


module.exports = RawTx
