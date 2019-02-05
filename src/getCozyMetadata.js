const get = require('lodash/get')
const union = require('lodash/union')

const { APP_NAME, ADD_COZY_METADATA } = require('./constants')

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
