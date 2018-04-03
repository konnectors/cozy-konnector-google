const transpile = require('./transpiler')

describe('Transpile from google-contacts to io.cozy-contacts', () => {
  test('Simple test', () => {
    const source = require('../sample/alanturing.json')

    const transpiled = transpile.toCozy(source)
    expect(transpiled).toMatchSnapshot()
  })

  test('complete tests with `sample/*.json', () => {
    const source = require('../sample/google-contacts.json')

    const transpiled = source.map(row => ({
      doc: transpile.toCozy(row)
    }))
    expect(transpiled).toMatchSnapshot()
  })
})
