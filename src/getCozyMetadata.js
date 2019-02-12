const get = require('lodash/get')
const union = require('lodash/union')

const {
  APP_NAME,
  APP_VERSION,
  DOCTYPE_CONTACTS_VERSION,
  ADD_COZY_METADATA
} = require('./constants')

module.exports = (cozyContact, googleContact, sourceAccountId) => {
  let additionalData = {}
  if (ADD_COZY_METADATA) {
    const updatedByApps = union(
      get(cozyContact, 'cozyMetadata.updatedByApps', []),
      [APP_NAME]
    )

    const now = new Date().toISOString()
    additionalData = {
      cozyMetadata: {
        doctypeVersion: DOCTYPE_CONTACTS_VERSION,
        createdAt: now,
        createdByApp: APP_NAME,
        createdByAppVersion: APP_VERSION,
        importedFrom: APP_NAME,
        importedAt: now,
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

  return additionalData
}
