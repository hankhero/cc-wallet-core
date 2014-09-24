var expect = require('chai').expect

var Network = require('../src/Network')


// Now testing testnet network
describe.only('Network', function() {
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
})
