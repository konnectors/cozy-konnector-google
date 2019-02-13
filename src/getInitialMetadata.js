const {
  APP_NAME,
  APP_VERSION,
  DOCTYPE_CONTACTS_VERSION,
  ADD_COZY_METADATA
} = require('./constants')

module.exports = (etag, resourceName, contactAccountId) => {
  let additionalData = {}
  if (ADD_COZY_METADATA) {
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
        updatedByApps: [APP_NAME],
        sync: {
          [contactAccountId]: {
            konnector: APP_NAME,
            lastSync: now,
            remoteRev: etag,
            id: resourceName,
            contactsAccountsId: contactAccountId
          }
        }
      }
    }
  }

  return additionalData
}
