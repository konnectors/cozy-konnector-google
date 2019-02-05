const get = require('lodash/get')

const getCozyMetadata = require('./getCozyMetadata')
const transpiler = require('./transpiler')

const getCozyToGoogleStrategy = (cozyClient, googleUtils, sourceAccountId) => ({
  findRemoteDocument: (cozyContact, googleContacts) => {
    const resourceName = get(
      cozyContact,
      ['cozyMetadata', 'sync', sourceAccountId, 'id'],
      null
    )

    if (resourceName) {
      return googleContacts.find(
        googleContact => googleContact.resourceName === resourceName
      )
    }

    return undefined
  },
  shouldSave: cozyContact =>
    !cozyContact.cozyMetadata.sync ||
    cozyContact.cozyMetadata.sync[sourceAccountId] === undefined,
  save: cozyContact =>
    googleUtils.createContact(transpiler.toGoogle(cozyContact)),
  afterSave: async (cozyContact, googleContact) => {
    const response = await cozyClient.save({
      ...cozyContact,
      ...getCozyMetadata(cozyContact, googleContact, sourceAccountId)
    })

    return Promise.resolve(response.data.id)
  }
})

module.exports = getCozyToGoogleStrategy
