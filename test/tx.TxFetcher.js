var expect = require('chai').expect

var Wallet = require('../src/index')


describe('tx.TxFetcher', function() {var wallet
  var txFetcher
  var addresses

  beforeEach(function() {
    wallet = new Wallet({ masterKey: '123131123131123131123131123131123131123131123131123131', testnet: true })
    var bitcoinAsset = wallet.getAssetDefinitionByMoniker('bitcoin')

    txFetcher = wallet.getTxFetcher()
    addresses = wallet.getAllAddresses(bitcoinAsset)
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
    txFetcher.fullScanAddresses(addresses, function(error) {
      expect(error).to.be.null
      done()
    })
  })
})
