const transpiler = require('./transpiler')
const merge = require('lodash/merge')

const mergeContact = (cozyContact = {}, googleContact = {}) => {
  const transpiledGoogleContact = transpiler.toCozy(googleContact)
  return merge({}, cozyContact, transpiledGoogleContact)
}

module.exports = mergeContact
