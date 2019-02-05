const get = require('lodash/get')
const union = require('lodash/union')

const { ADD_COZY_METADATA, APP_NAME } = require('./constants')
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
  afterSave: (cozyContact, googleContact) => {
    let additionalData = {}
    if (ADD_COZY_METADATA) {
      const updatedByApps = union(cozyContact.cozyMetadata.updatedByApps, [
        APP_NAME
      ])
      const now = new Date().toISOString()
      additionalData = {
        cozyMetadata: {
          updatedAt: now,
          updatedByApps,
          sync: {
            [sourceAccountId]: {
              konnector: APP_NAME,
              lastSync: now,
              remoteRev: googleContact.etag,
              id: googleContact.resourceName,
              contactsAccountsId: sourceAccountId
            }
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
