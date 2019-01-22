const { ADD_COZY_METADATA } = require('./constants')
const transpiler = require('./transpiler')

const getCozyToGoogleStrategy = (cozyClient, googleUtils) => ({
  findRemoteDocument: (cozyContact, googleContacts) => {
    const resourceName =
      (cozyContact.cozyMetadata && cozyContact.cozyMetadata.sync.id) || null
    if (resourceName) {
      return googleContacts.find(
        googleContact => googleContact.resourceName === resourceName
      )
    }

    return undefined
  },
  shouldSave: googleContact => !googleContact,
  save: cozyContact =>
    googleUtils.createContact(transpiler.toGoogle(cozyContact)),
  afterSave: (cozyContact, googleContact) => {
    let additionalData = {}
    if (ADD_COZY_METADATA) {
      additionalData = {
        cozyMetadata: {
          sync: {
            konnector: 'google',
            lastSync: Date.now(),
            remoteRev: googleContact.etag,
            id: googleContact.resourceName
          }
        }
      }
    }

    return cozyClient.save({
      ...cozyContact,
      ...additionalData
    })
  }
})

module.exports = getCozyToGoogleStrategy
