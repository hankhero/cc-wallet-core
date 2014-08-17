var _ = require('lodash')
var Q = require('q')
var bitcoin = require('bitcoinjs-lib')
var cclib = require('coloredcoinjs-lib')

var AssetTx = require('./AssetTx')
var OperationalTx = require('./OperationalTx')
var ComposedTx = cclib.tx.ComposedTx
var Transaction = cclib.tx.Transaction


/**
 * @class TxTranformer
 *
 * An object that can transform one type of transaction into another
 *
 * AssetTx  -> OperationalTx -> ComposedTx -> Transaction
 * "simple" -> "operational" -> "composed" -> "signed"
 */
function TxTranformer() {}

/**
 * For a given transaction tx, returns a string that represents
 *  the type of transaction (asset, operational, composed, signed) that it is
 *
 * @param {(AssetTx|OperationalTx|ComposedTx|Transaction)} tx
 * @return {?string}
 */
TxTranformer.prototype.classifyTx = function(tx) {
  if (tx instanceof AssetTx)
    return 'asset'

  if (tx instanceof OperationalTx)
    return 'operational'

  if (tx instanceof ComposedTx)
    return 'composed'

  if (tx instanceof Transaction) {
    var isSigned = tx.ins.every(function(input) { return input.script !== bitcoin.Script.EMPTY })
    if (isSigned)
      return 'signed'
  }

  return null
}

/**
 * @callback TxTranformer~transformAssetTx
 * @param {?Error} error
 * @param {OperationalTx} operationalTx
 */

/**
 * Takes a AssetTx assetTx and returns a transaction
 *  of type targetKind which is one of (operational, composed, signed)
 *
 * @param {AssetTx} assetTx
 * @param {string} targetKind
 * @param {TxTranformer~transformAssetTx} cb
 */
TxTranformer.prototype.transformAssetTx = function(assetTx, targetKind, cb) {
  var self = this

  Q.fcall(function() {
    if (['operational', 'composed', 'signed'].indexOf(targetKind) === -1)
      throw new Error('do not know how to transform assetTx')

    if (!assetTx.isMonoColor())
      throw new Error('multi color AssetTx not supported')

    var operationalTx = assetTx.makeOperationalTx()
    return Q.ninvoke(self, 'transformTx', operationalTx, targetKind)

  }).then(function(targetTx) {
    cb(null, targetTx)

  }).fail(function(error) {
    cb(error)

  }).done()
}

/**
 * @callback TxTranformer~transformOperationalTx
 * @param {?Error} error
 * @param {ComposedTx} composedTx
 */

/**
 * Takes a OperationalTx operationalTx and returns a transaction
 *  of type targetKind which is one of (composed, signed)
 *
 * @param {OperationalTx} operationalTx
 * @param {string} targetKind
 * @param {TxTranformer~transformOperationalTx} cb
 */
TxTranformer.prototype.transformOperationalTx = function(operationalTx, targetKind, cb) {
  var self = this

  Q.fcall(function() {
    if (['composed', 'signed'].indexOf(targetKind) === -1)
      throw new Error('do not know how to transform operationalTx')

    if (!operationalTx.isMonoColor())
      throw new Error('multi color operationalTx not supported')

    var composer = operationalTx.getTargets()[0].getColorDefinition().constructor.makeComposeTx
    if (_.isUndefined(composer))
      throw new Error('composer not found')

    return Q.nfcall(composer, operationalTx)

  }).then(function(composedTx) {
    return Q.ninvoke(self, 'transformTx', composedTx, targetKind)

  }).then(function(targetTx) {
    cb(null, targetTx)

  }).fail(function(error) {
    cb(error)

  }).done()
}

/**
 * @callback TxTranformer~transformComposedTx
 * @param {?Error} error
 * @param {Transaction} tx
 */

/**
 * Takes a ComposedTx composedTx and returns a transaction
 *  of type targetKind which is one of (signed)
 *
 * @param {ComposedTx} composedTx
 * @param {string} targetKind
 * @param {TxTranformer~transformComposedTx} cb
 */
TxTranformer.prototype.transformComposedTx = function(composedTx, targetKind, cb) {
  var self = this

  Q.fcall(function() {
    if (['signed'].indexOf(targetKind) === -1)
      throw new Error('do not know how to transform composedTx')

    var tx = new bitcoin.Transaction()
    composedTx.getTxIns().forEach(function(txIn) {
      tx.addInput(txIn.txId, txIn.outIndex)
    })
    composedTx.getTxOuts().forEach(function(txOut) {
      tx.addOutput(txOut.address, txOut.value)
    })

    composedTx.getTxIns().forEach(function(txIn, index) {
      var privKey = composedTx.operationalTx.wallet.aManager.getPrivKeyByAddress(txIn.address)
      tx.sign(index, privKey)
    })

    var ccTx = new cclib.tx.Transaction()
    ccTx.version = tx.version
    ccTx.locktime = tx.locktime
    ccTx.ins = tx.ins
    ccTx.outs = tx.outs

    return ccTx

  }).then(function(targetTx) {
    cb(null, targetTx)

  }).fail(function(error) {
    cb(error)

  }).done()
}

/**
 * @callback TxTranformer~transformSignedTx
 * @param {Error} error
 */

/**
 * This method is not yet implemented.
 *
 * @param {*} tx
 * @param {*} targetKind
 * @param {TxTranformer~transformSignedTx} cb
 */
TxTranformer.prototype.transformSignedTx = function(tx, targetKind, cb) {
  process.nextTick(function() {
    cb(new Error('do not know how to transform signed tx'))
  })
}

/**
 * @callback TxTranformer~transformTx
 * @param {?Error} error
 * @param {(OpeationalTx|ComposedTx|Transaction)} tx
 */

/**
 * Transform a transaction tx into another type of transaction defined by targetKind.
 *
 * @param {(AssetTx|OperationalTx|ComposedTx)} tx
 * @param {string} targetKind
 * @param {TxTranformer~transformTx} cb
 */
TxTranformer.prototype.transformTx = function(tx, targetKind, cb) {
  var self = this

  Q.fcall(function() {
    var currentKind = self.classifyTx(tx)
    if (currentKind === targetKind)
      return tx

    if (currentKind === 'asset')
      return Q.ninvoke(self, 'transformAssetTx', tx, targetKind)

    if (currentKind === 'operational')
      return Q.ninvoke(self, 'transformOperationalTx', tx, targetKind)

    if (currentKind === 'composed')
      return Q.ninvoke(self, 'transformComposedTx', tx, targetKind)

    if (currentKind === 'signed')
      return Q.ninvoke(self, 'transformSignedTx', tx, targetKind)

    throw new Error('targetKind is not recognized')

  }).then(function(targetTx) {
    cb(null, targetTx)

  }).fail(function(error) {
    cb(error)

  }).done()
}


module.exports = TxTranformer
