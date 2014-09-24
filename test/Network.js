var crypto = require('crypto')

var expect = require('chai').expect

var Network = require('../src/Network')


// testnet
describe.skip('Network', function() {
  var network

  beforeEach(function(done) {
    var opts = {
      host: 'localhost'
    }
    network = new Network(opts)
    network.once('connect', done)
    network.initialize()
  })

  afterEach(function(done) {
    network.once('disconnect', done)
    network.disconnect()
  })

  it('wait newHeight event', function(done) {
    network.once('newHeight', function(height) {
      expect(height).to.be.at.least(0)
      done()
    })
  })

  it('address subscribe', function(done) {
    network.addressSubscribe('ms8XQE6MHsreo9ZJx1vXqQVgzi84xb9FRZ').done(done, done)
  })

  it('getCurrentHeight', function(done) {
    network.once('newHeight', function(height) {
      expect(network.getCurrentHeight()).to.be.at.least(0)
      done()
    })
  })

  it('getHeader', function(done) {
    network.getHeader(0).then(function(header) {
      expect(header).to.deep.equal({
        block_height: 0,
        version: 1,
        prev_block_hash: null,
        merkle_root: '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b',
        timestamp: 1296688602,
        bits: 486604799,
        nonce: 414098458
      })
      done()
    }).catch(function(error) { throw error })
  })

  it('getChunk', function(done) {
    network.getChunk(0).then(function(chunk) {
      expect(chunk).to.have.length(160*2016)
      expect(crypto.createHash('md5').update(chunk).digest('hex')).to.equal('10a1c67b37baa70b0b4db4b86e98ccb6')
      done()
    }).catch(function(error) { throw error })
  })

  it('getTx', function(done) {
    var txId = '9854bf4761024a1075ebede93d968ce1ba98d240ba282fb1f0170e555d8fdbd8'
    var rawTx = '0100000001e9ae17624eca5fd54249486b5bd0f07d0ae6c5f1bd103fa1ef47ac461f1c3d78010000006b483045022100c9c4ad4a69fe6b6f8b1360938e6b65e638f7989996e3f4bf30ceed07bd1d902002205a2fd3d01696e9c768c8b893dc4ffff21df3420d098836da0e4fdc67ef468bf3012103ad090d636ad6e74d81ce1d1f04734104264a446e76d3395ed8bc44bc2980422affffffff02002d3101000000001976a914244bfc8d8bb36d74043c514d9797b116469fefcc88ac9fb25c00000000001976a91419bf5d17ac5c3205cc3c89bfd24f445e3bdfe27988ac00000000'

    network.getTx(txId).then(function(tx) {
      expect(tx.toHex()).to.equal(rawTx)
      done()
    }).catch(function(error) { throw error })
  })

  it('getMerkle', function(done) {
    var txId = '9854bf4761024a1075ebede93d968ce1ba98d240ba282fb1f0170e555d8fdbd8'
    var merkle = {
      block_height: 279774,
      merkle: [
        '289eb5dab9aad256a7f508377f8cec7df4c3eae07572a8d7273e303a81313e03',
        'b8a668d25ff4c5cf7f5f7fcdf504b695b87768a217fd131645b8712cbef56ebc',
        'c3fe05147e431270966a1f11e2ddab4b6d7ab3f848c651f455ead409bd8ed28f',
        'bdc4c6d8dfd51012d14e8f05bdb4d41de125abe98716afa162ba3203ab662b76',
        '3312f4e797842662e9312e1dc8dcb2ea67e71bacc75452bb3f334d106f59fb33',
        'ee4fa69f14997438d21fc3227b0f52f7d5fd074db00f159f5ac880ddc0559446'
      ],
      pos: 4
    }

    network.getMerkle(txId, 279774).then(function(result) {
      expect(result).to.deep.equal(merkle)
      done()
    }).catch(function(error) { throw error })
  })

  it.skip('sendTx', function() {})

  it('getUTXO', function(done) {
    var address = 'mn675cxzUzM8hyd7TYApCvGBhQ8v69kgGb'
    var utxo = [
      {
        tx_hash: 'd56e75eedb9e9e49a8ae81c3d4781312c4d343bea811219d3eb4184ae6b34639',
        tx_pos: 0,
        value: 5025150000,
        height: 103546
      },
      {
        tx_hash: '548be1cc68780cbe0ce7e4b46c06dbe38ecd509a3f448e5ca68cc294679c27b1',
        tx_pos: 0,
        value: 5025050000,
        height: 103548
      }
    ]

    network.getUTXO(address).then(function(result) {
      expect(result).to.deep.equal(utxo)
      done()
    }).catch(function(error) { throw error })
  })

  it('getHistory', function(done) {
    var address = 'miASVwyhoeFqoLodXUdbDC5YjrdJPwxyXE'
    var history = [
      {
        tx_hash: '1bd6a31671e9cc767d75980d4dbffc5cd5029f17d44dd32dcf949267e3f04631',
        height: 12740
      },
      {
        tx_hash: '9ea76cd53be261b320d8479d432aad98c61aa5945416d85ab15bed62030ce6e4',
        height: 16349
      }
    ]

    network.getHistory(address).then(function(result) {
      expect(result).to.deep.equal(history)
      done()
    }).catch(function(error) { throw error })
  })
})
