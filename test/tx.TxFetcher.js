var expect = require('chai').expect

var Wallet = require('../src/index').Wallet


describe('tx.TxFetcher', function() {
  var wallet, txFetcher, addresses

  beforeEach(function() {
    wallet = new Wallet({ testnet: true })
    wallet.initialize('123131123131123131123131123131123131123131123131123131')

    txFetcher = wallet.getTxFetcher()
    addresses = wallet.getAllAddresses(wallet.getAssetDefinitionByMoniker('bitcoin'))
  })

  afterEach(function() {
    wallet.clearStorage()
  })

  it('scanAddressesUnspent', function(done) {
    txFetcher.scanAddressesUnspent(addresses, function(error) {
      expect(error).to.be.null
      done()
    })
  })

  it('fullScanAddresses', function(done) {
    this.timeout(60 * 1000)
    txFetcher.fullScanAddresses(addresses, function(error) {
      expect(error).to.be.null
      done()
    })
  })
})
