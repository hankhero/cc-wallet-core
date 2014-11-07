var blockchainImplementationTest = require('./blockchain.implementation.js')

blockchainImplementationTest({
  // why describe.skip: BlockrIO is currently (6 nov 2014) not working,
  // we get frequent "Too many requests"
  describe: describe.skip,
  name: 'blockchain.BlockrIO',
  clazz: blockchain.BlockrIo
})
