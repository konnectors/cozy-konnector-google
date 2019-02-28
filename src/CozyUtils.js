const { log } = require('cozy-konnector-libs')
const get = require('lodash/get')
const CozyClient = require('cozy-client').default

const {
  APP_NAME,
  APP_VERSION,
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

function getSchema(accountId) {
  return {
    contacts: {
      doctype: DOCTYPE_CONTACTS,
      cozyMetadata: {
        createdByApp: {
          trigger: 'creation',
          value: APP_NAME
        },
        updatedByApps: {
          trigger: 'update',
          value: [APP_NAME]
        },
        createdAt: {
          trigger: 'creation',
          useCurrentDate: true
        },
        updatedAt: {
          trigger: 'update',
          useCurrentDate: true
        },
        doctypeVersion: {
          trigger: 'update',
          value: 2
        },
        createdByAppVersion: {
          trigger: 'update',
          value: APP_VERSION
        },
        sourceAccount: {
          trigger: 'creation',
          value: accountId
        }
      }
    },
    contactsAccounts: {
      doctype: DOCTYPE_CONTACTS_ACCOUNT
    }
  }
}

function initCozyClient(schema = null) {
  const environment =
    process.env.NODE_ENV === 'none' ? 'production' : process.env.NODE_ENV
  try {
    const uri = getCozyUrl(environment)
    const token = getAccessToken(environment)
    return new CozyClient({ uri, token, schema })
  } catch (err) {
    log('error', 'Unable to initialize cozy client')
    throw err
  }
}

class CozyUtils {
  constructor(accountId) {
    this.client = initCozyClient(getSchema(accountId))
  }

  prepareIndex(contactAccountId) {
    return this.client
      .collection(DOCTYPE_CONTACTS)
      .createIndex([`cozyMetadata.sync.${contactAccountId}.id`])
  }

  async getUpdatedContacts(lastSync) {
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
            //TODO: filter by contact account id / email -> only the second time, otherwise no contacts come up
          }
        },
        { indexedFields: ['cozyMetadata.updatedAt'] }
      )
      allContacts = [...allContacts, ...resp.data]
      hasMore = resp.next
    }

    return allContacts
  }

  async findContact(accountId, resourceName) {
    const contactsCollection = this.client.collection(DOCTYPE_CONTACTS)
    const resp = await contactsCollection.find(
      {
        cozyMetadata: {
          sync: {
            [accountId]: {
              id: resourceName
            }
          }
        }
      },
      { indexedFields: [`cozyMetadata.sync.${accountId}.id`] }
    )

    return get(resp, 'data.0')
  }

  async findOrCreateContactAccount(accountId, accountEmail) {
    const accountsCollection = this.client.collection(DOCTYPE_CONTACTS_ACCOUNT)
    const result = await accountsCollection.find({
      sourceAccount: accountId
    })

    let contactAccount = null
    if (result.data.length > 0) {
      contactAccount = result.data[0]
    } else {
      const resp = await this.client.save({
        canLinkContacts: true,
        shouldSyncOrphan: true,
        lastSync: null,
        lastLocalSync: null,
        name: accountEmail,
        _type: DOCTYPE_CONTACTS_ACCOUNT,
        type: APP_NAME,
        sourceAccount: accountId,
        version: 1
      })
      contactAccount = resp.data
    }

    return contactAccount
  }

  save(params) {
    return this.client.save(params)
  }
}

module.exports = CozyUtils
