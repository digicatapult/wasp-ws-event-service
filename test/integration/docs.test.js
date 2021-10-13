const { describe, before, it } = require('mocha')
const jsonChai = require('chai-json')
const { expect } = require('chai').use(jsonChai)

const { setupServer } = require('./helpers/setupHelper.js')

describe('async-docs', function () {
  const context = {}
  setupServer(context)

  before(async function () {
    context.response = await context.request.get(`/async-docs`)
  })

  it('should return 200', function () {
    expect(context.response.status).to.equal(200)
  })

  it('successfully returns', function () {
    expect(context.response.body).to.be.a.jsonObj()
    expect(JSON.stringify(context.response.body)).to.include('asyncapi')
  })
})
