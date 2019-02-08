const { log } = require('cozy-konnector-libs')
const CozyClient = require('cozy-client').default

const {
  APP_NAME,
  DOCTYPE_CONTACTS,
  DOCTYPE_CONTACTS_ACCOUNT
} = require('./constants')

function getAccessToken(environment) {
  try {
    if (environment === 'development') {
      const cozyCredentials = JSON.parse(process.env.COZY_CREDENTIALS)
      return cozyCredentials.token.accessToken
    } else {
      return process.env.COZY_CREDENTIALS.trim()
    }
  } catch (err) {
    log(
      'error',
      `Please provide proper COZY_CREDENTIALS environment variable. ${
        process.env.COZY_CREDENTIALS
      } is not OK`
    )

    throw err
  }
}

function getCozyUrl() {
  if (process.env.COZY_URL === undefined) {
    log('error', 'Please provide COZY_URL environment variable.')
    throw new Error('COZY_URL environment variable is absent/not valid')
  } else {
    return process.env.COZY_URL
  }
}

function initCozyClient() {
  const environment =
    process.env.NODE_ENV === 'none' ? 'production' : process.env.NODE_ENV
  try {
    const uri = getCozyUrl(environment)
    const token = getAccessToken(environment)
    return new CozyClient({ uri, token })
  } catch (err) {
    log('error', 'Unable to initialize cozy client')
    throw err
  }
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
