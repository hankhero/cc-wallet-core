var expect = require('chai').expect

var _ = require('lodash')
var cclib = require('coloredcoinjs-lib')

var AssetDefinition = require('../src/asset').AssetDefinition
var Wallet = require('../src/index')


describe('Wallet', function() {
  var wallet
  var masterKey = '123131123131123131123131123131123131123131123131123131'

  beforeEach(function() {
    wallet = new Wallet({ masterKey: masterKey, testnet: true })
  })

  afterEach(function() {
    wallet.clearStorage()
  })

  it('_getCoinQuery return CoinQuery instance', function() {
    expect(wallet.getCoinQuery()).to.be.instanceof(cclib.coin.CoinQuery)
  })

  it('sendCoins', function(done) {
    wallet = new Wallet({ masterKey: '421fc385fdae762b346b80e0212f77bb', testnet: true })

    var bitcoin = wallet.getAssetDefinitionByMoniker('bitcoin')
    var address = wallet.getSomeAddress(bitcoin)
    //console.log('Address from: ' + address)
    //console.log('Address to:   ' + 'mo8Ni5kFSxcuEVXbfBaSaDzMiq1j4E6wUE')
    var targets = [{ address: 'mo8Ni5kFSxcuEVXbfBaSaDzMiq1j4E6wUE', value: 10000 }]
    wallet.sendCoins(bitcoin, targets, function(error, txId) {
      //console.log(error, txId)
      expect(error).to.be.null
      expect(txId).to.be.an('string').with.to.have.length(64)
      done()
    })
  })

  it('sendCoins epobc', function(done) {
    wallet = new Wallet({ masterKey: '421fc385fdae762b346b80e0212f77bc', testnet: true })

    var data = {
      monikers: ['gold'],
      colorSchemes: ['epobc:73560ffd916267a70a1233eb63d5d97e79e7eac981a52860df1ac38d2568b3a5:0:274664'],
      unit: 10000
    }
    var assetdef = wallet.addAssetDefinition(data)
    var address = wallet.getSomeAddress(assetdef)
    //console.log('Address from: ' + address)
    //console.log('Address to:   ' + 'mo8Ni5kFSxcuEVXbfBaSaDzMiq1j4E6wUE')
    var targets = [{ address: 'mo8Ni5kFSxcuEVXbfBaSaDzMiq1j4E6wUE', value: 10000 }]
    //wallet.getAvailableBalance(assetdef, function(error, balance) {
      //console.log(error, balance, assetdef.formatValue(balance))
    wallet.sendCoins(assetdef, targets, function(error, txId) {
      //console.log(error, txId)
      expect(error).to.be.null
      expect(txId).to.be.an('string').with.to.have.length(64)
      done()
    })
  })

  describe('asset methods', function() {
    it('addAssetDefinition throw error', function() {
      var data = {
        monikers: ['bitcoin'],
        colorSchemes: ['']
      }
      var fn = function() { wallet.addAssetDefinition(data) }
      expect(fn).to.throw(Error)
    })

    it('addAssetDefinition return AssetDefinition', function() {
      var data = {
        monikers: ['gold'],
        colorSchemes: ['epobc:b95323a763fa507110a89ab857af8e949810cf1e67e91104cd64222a04ccd0bb:0:180679'],
        unit: 10
      }
      var result = wallet.addAssetDefinition(data)
      expect(result).to.be.instanceof(AssetDefinition)
      expect(result.getData()).to.deep.equal(data)
    })

    it('getAssetDefinitionByMoniker', function() {
      var result = wallet.getAssetDefinitionByMoniker('bitcoin')
      expect(result).to.be.instanceof(AssetDefinition)
      expect(result.getData()).to.deep.equal({ monikers: ['bitcoin'], colorSchemes: [''], unit: 100000000 })
    })

    it('getAllAssetDefinitions', function() {
      var result = wallet.getAllAssetDefinitions()
      expect(result).to.have.length(1)
      expect(result[0]).to.be.instanceof(AssetDefinition)
      expect(result[0].getData()).to.deep.equal({ monikers: ['bitcoin'], colorSchemes: [''], unit: 100000000 })
    })
  })

  describe('address methods', function() {
    var bitcoin, epobc

    beforeEach(function() {
      var result = wallet.addAssetDefinition({
        monikers: ['gold'],
        colorSchemes: ['epobc:b95323a763fa507110a89ab857af8e949810cf1e67e91104cd64222a04ccd0bb:0:180679'],
        unit: 10
      })
      expect(result).to.be.instanceof(AssetDefinition)
      bitcoin = wallet.getAssetDefinitionByMoniker('bitcoin')
      epobc = wallet.getAssetDefinitionByMoniker('gold')
    })

    it('getNewAddress', function() {
      var newAddress = wallet.getNewAddress(bitcoin)
      expect(newAddress).to.equal('mmFYK2Mofiwtm68ZTYK7etjiGyf3SeLkgo')
    })

    it('getSomeAddress', function() {
      var someAddress = wallet.getSomeAddress(bitcoin)
      expect(someAddress).to.equal('mmHBqwp1fDwWXaXqo5ZrEE4qAoXH5xkUvd')
    })

    it('getAllAddresses', function() {
      var addresses = wallet.getAllAddresses(bitcoin)
      expect(addresses).to.deep.equal(['mmHBqwp1fDwWXaXqo5ZrEE4qAoXH5xkUvd'])
    })
  })

  describe('balance methods', function() {
    var bitcoin, epobc

    beforeEach(function() {
      var result = wallet.addAssetDefinition({
        monikers: ['gold'],
        colorSchemes: ['epobc:b95323a763fa507110a89ab857af8e949810cf1e67e91104cd64222a04ccd0bb:0:180679'],
        unit: 10
      })
      expect(result).to.be.instanceof(AssetDefinition)
      bitcoin = wallet.getAssetDefinitionByMoniker('bitcoin')
      epobc = wallet.getAssetDefinitionByMoniker('gold')
    })

    it('getAvailableBalance for bitcoin', function(done) {
      wallet.getAvailableBalance(bitcoin, function(error, balance) {
        expect(error).to.be.null
        expect(balance).to.equal(67000000)
        done()
      })
    })

    it('getAvailableBalance for epobc', function(done) {
      wallet.getAvailableBalance(epobc, function(error, balance) {
        expect(error).to.be.null
        expect(balance).to.equal(2000)
        done()
      })
    })

    it('getTotalBalance for bitcoin', function(done) {
      wallet.getTotalBalance(bitcoin, function(error, balance) {
        expect(error).to.be.null
        expect(balance).to.equal(67000000)
        done()
      })
    })

    it('getTotalBalance for epobc', function(done) {
      wallet.getTotalBalance(epobc, function(error, balance) {
        expect(error).to.be.null
        expect(balance).to.equal(2000)
        done()
      })
    })

    it('getUnconfirmedBalance for bitcoin', function(done) {
      wallet.getUnconfirmedBalance(bitcoin, function(error, balance) {
        expect(error).to.be.null
        expect(balance).to.equal(0)
        done()
      })
    })

    it('getUnconfirmedBalance for epobc', function(done) {
      wallet.getUnconfirmedBalance(epobc, function(error, balance) {
        expect(error).to.be.null
        expect(balance).to.equal(0)
        done()
      })
    })
  })
})
