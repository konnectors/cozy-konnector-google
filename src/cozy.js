const CozyClient = require('cozy-client').default

const {
  APP_NAME,
  DOCTYPE_CONTACTS,
  DOCTYPE_CONTACTS_ACCOUNT
} = require('./constants')

function initCozyClient() {
  const cozyCredentials = JSON.parse(process.env.COZY_CREDENTIALS)
  return new CozyClient({
    uri: process.env.COZY_URL,
    token: cozyCredentials.token.accessToken
  })
}

module.exports = (() => ({
  client: this.client || initCozyClient(),

  getUpdatedContacts: async function(lastSync) {
    let allContacts = []
    const contactsCollection = this.client.collection(DOCTYPE_CONTACTS)
    let hasMore = true
    while (hasMore) {
      const resp = await contactsCollection.find(
        {
          cozyMetadata: {
            updatedAt: {
              $gt: lastSync
            }
          }
        },
        { indexedFields: ['cozyMetadata.updatedAt'] }
      )
      allContacts = [...allContacts, ...resp.data]
      hasMore = resp.next
    }

    return allContacts
  },

  findOrCreateContactAccount: async function(accountID, accountEmail) {
    const accountsCollection = this.client.collection(DOCTYPE_CONTACTS_ACCOUNT)
    const result = await accountsCollection.find({
      sourceAccount: accountID
    })

    let contactAccount = null
    if (result.data.length > 0) {
      contactAccount = result.data[0]
    } else {
      const resp = await this.client.save({
        canLinkContacts: true,
        name: accountEmail,
        _type: DOCTYPE_CONTACTS_ACCOUNT,
        type: APP_NAME,
        sourceAccount: accountID,
        version: 1
      })
      contactAccount = resp.data
    }

    return contactAccount
  },

  save: function(params) {
    return this.client.save(params)
  }
}))()
