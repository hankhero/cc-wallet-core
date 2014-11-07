var blockchainImplementationTest = require('./blockchain.implementation.js')

var blockchain = require('../src/blockchain')

blockchainImplementationTest({
  name: 'blockchain.Chain',
  clazz: blockchain.Chain
})
