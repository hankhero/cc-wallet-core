var expect = require('chai').expect

var blockchain = require('../src/blockchain')


describe('blockchain.BlockchainBase', function() {
  var bs

  beforeEach(function() {
    bs = new blockchain.BlockchainBase()
  })

  it('getBlockCount', function() {
    expect(bs.getBlockCount).to.throw(Error)
  })

  it('getTx', function() {
    expect(bs.getTx).to.throw(Error)
  })

  it('getTxBlockHash', function() {
    expect(bs.getTxBlockHash).to.throw(Error)
  })

  it('getBlockHeight', function() {
    expect(bs.getBlockHeight).to.throw(Error)
  })

  it('sendTx', function() {
    expect(bs.sendTx).to.throw(Error)
  })

  it('getUTXO', function() {
    expect(bs.getUTXO).to.throw(Error)
  })

  it('getHistory', function() {
    expect(bs.getHistory).to.throw(Error)
  })
})
