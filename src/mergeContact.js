const transpiler = require('./transpiler')
const mergeWith = require('lodash/mergeWith')
const isArray = require('lodash/isArray')

const customizer = (objValue, srcValue) => {
  if (srcValue === undefined) {
    return null
  } else if (isArray(srcValue)) {
    return srcValue
  }
}

const mergeContact = (cozyContact = {}, googleContact = {}, options = {}) => {
  const { preferGoogle = true } = options
  const transpiledGoogleContact = transpiler.toCozy(googleContact)

  if (preferGoogle) {
    return mergeWith({}, cozyContact, transpiledGoogleContact, customizer)
  } else {
    return mergeWith({}, transpiledGoogleContact, cozyContact, customizer)
  }
}

module.exports = mergeContact
