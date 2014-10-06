var _ = require('lodash')
var Q = require('q')
var bitcoin = require('bitcoinjs-lib')
var cclib = require('coloredcoinjs-lib')

var AssetTx = require('./AssetTx')
var OperationalTx = require('./OperationalTx')
var ComposedTx = cclib.ComposedTx
var Transaction = cclib.Transaction


/**
 * For a given transaction tx, returns a string that represents
 *  the type of transaction (asset, operational, composed, signed) that it is
 *
 * @param {(AssetTx|OperationalTx|ComposedTx|Transaction)} tx
 * @return {?string}
 */
function classifyTx(tx) {
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
 * @callback transformAssetTx~callback
 * @param {?Error} error
 * @param {OperationalTx} operationalTx
 */

/**
 * Takes a AssetTx assetTx and returns a transaction
 *  of type targetKind which is one of (operational, composed, signed)
 *
 * @param {AssetTx} assetTx
 * @param {string} targetKind
 * @param {(Buffer|string)} seed
 * @param {transformAssetTx~callback} cb
 */
function transformAssetTx(assetTx, targetKind, seed, cb) {
  Q.fcall(function() {
    if (['operational', 'composed', 'signed'].indexOf(targetKind) === -1)
      throw new Error('do not know how to transform assetTx')

    if (!assetTx.isMonoColor())
      throw new Error('multi color AssetTx not supported')

    var operationalTx = assetTx.makeOperationalTx()
    return Q.nfcall(transformTx, operationalTx, targetKind, seed)

  }).done(function(targetTx) { cb(null, targetTx) }, function(error) { cb(error) })
}

/**
 * @callback transformOperationalTx~callback
 * @param {?Error} error
 * @param {ComposedTx} composedTx
 */

/**
 * Takes a OperationalTx operationalTx and returns a transaction
 *  of type targetKind which is one of (composed, signed)
 *
 * @param {OperationalTx} operationalTx
 * @param {string} targetKind
 * @param {(Buffer|string)} seed
 * @param {transformOperationalTx~callback} cb
 */
function transformOperationalTx(operationalTx, targetKind, seed, cb) {
  Q.fcall(function() {
    if (['composed', 'signed'].indexOf(targetKind) === -1)
      throw new Error('do not know how to transform operationalTx')

    if (!operationalTx.isMonoColor())
      throw new Error('multi color operationalTx not supported')

    var composer = operationalTx.getTargets()[0].getColorDefinition().constructor.makeComposedTx
    if (_.isUndefined(composer))
      throw new Error('composer not found')

    return Q.nfcall(composer, operationalTx)

  }).then(function(composedTx) {
    return Q.nfcall(transformTx, composedTx, targetKind, seed)

  }).done(function(targetTx) { cb(null, targetTx) }, function(error) { cb(error) })
}

/**
 * @callback transformComposedTx~callback
 * @param {?Error} error
 * @param {Transaction} tx
 */

/**
 * Takes a ComposedTx composedTx and returns a transaction
 *  of type targetKind which is one of (signed)
 *
 * @param {ComposedTx} composedTx
 * @param {string} targetKind
 * @param {(Buffer|string)} seed
 * @param {transformComposedTx~callback} cb
 */
function transformComposedTx(composedTx, targetKind, seed, cb) {
  Q.fcall(function() {
    if (['signed'].indexOf(targetKind) === -1)
      throw new Error('do not know how to transform composedTx')

    var tx = new bitcoin.Transaction()
    composedTx.getTxIns().forEach(function(txIn) {
      tx.addInput(txIn.txId, txIn.outIndex, txIn.sequence)
    })
    composedTx.getTxOuts().forEach(function(txOut) {
      tx.addOutput(bitcoin.Script.fromBuffer(txOut.script), txOut.value)
    })

    composedTx.getTxIns().forEach(function(txIn, index) {
      var privKey = composedTx.operationalTx.wallet.getAddressManager().getPrivKeyByAddress(seed, txIn.address)
      tx.sign(index, privKey)
    })

    var ccTx = new cclib.Transaction()
    ccTx.version = tx.version
    ccTx.locktime = tx.locktime
    ccTx.ins = tx.ins
    ccTx.outs = tx.outs

    return ccTx

  }).then(function(signedTx) {
    return Q.nfcall(transformTx, signedTx, targetKind, seed)

  }).done(function(targetTx) { cb(null, targetTx) }, function(error) { cb(error) })
}

/**
 * @callback TxTranformer~transformTx
 * @param {?Error} error
 * @param {(OpeationalTx|ComposedTx|Transaction)} tx
 */

/**
 * Transform a transaction tx into another type of transaction defined by targetKind.
 *
 * AssetTx  -> OperationalTx -> ComposedTx -> Transaction
 * "simple" -> "operational" -> "composed" -> "signed"
 *
 * @param {(AssetTx|OperationalTx|ComposedTx)} tx
 * @param {string} targetKind
 * @param {(Buffer|string)} [seed] Required targetKind is signed
 * @param {TxTranformer~transformTx} cb
 */
function transformTx(tx, targetKind, seed, cb) {
  if (_.isUndefined(cb)) {
    cb = seed
    seed = undefined
  }

  Q.fcall(function() {
    var currentKind = classifyTx(tx)
    if (currentKind === targetKind)
      return tx

    if (currentKind === 'asset')
      return Q.nfcall(transformAssetTx, tx, targetKind, seed)

    if (currentKind === 'operational')
      return Q.nfcall(transformOperationalTx, tx, targetKind, seed)

    if (currentKind === 'composed')
      return Q.nfcall(transformComposedTx, tx, targetKind, seed)

    throw new Error('targetKind is not recognized')

  }).done(function(targetTx) { cb(null, targetTx) }, function(error) { cb(error) })
}


module.exports = transformTx
