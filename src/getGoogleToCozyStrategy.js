const get = require('lodash/get')

const { DOCTYPE_CONTACTS } = require('./constants')
const getCozyMetadata = require('./getCozyMetadata')
const transpiler = require('./transpiler')

const getGoogleToCozyStrategy = (cozyUtils, SOURCE_ACCOUNT_ID) => ({
  findRemoteDocument: (googleContact, cozyContacts) => {
    return cozyContacts.find(
      contact =>
        get(contact, ['cozyMetadata', 'sync', SOURCE_ACCOUNT_ID, 'id']) ===
        googleContact.resourceName
    )
  },

  shouldSave: (googleContact, cozyContact) => {
    return cozyContact === undefined
  },

  save: googleContact => {
    const newCozyContact = transpiler.toCozy(googleContact)
    const newCozyContactWithMetadata = {
      _type: DOCTYPE_CONTACTS,
      ...newCozyContact,
      ...getCozyMetadata(newCozyContact, googleContact, SOURCE_ACCOUNT_ID)
    }

    return cozyUtils.save(newCozyContactWithMetadata)
  },

  afterSave: (googleContact, cozyContact) => {
    return cozyContact.id
  }
})

module.exports = getGoogleToCozyStrategy
