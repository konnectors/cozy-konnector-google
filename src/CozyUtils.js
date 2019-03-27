const { log } = require('cozy-konnector-libs')
const get = require('lodash/get')
const CozyClient = require('cozy-client').default

const {
  APP_NAME,
  APP_VERSION,
  DOCTYPE_ACCOUNTS,
  DOCTYPE_ACCOUNTS_VERSION,
  DOCTYPE_CONTACTS,
  DOCTYPE_CONTACTS_ACCOUNT,
  DOCTYPE_CONTACTS_VERSION,
  DOCTYPE_CONTACTS_ACCOUNT_VERSION,
  SHOULD_SYNC_ORPHAN_DEFAULT_VALUE
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

function getSchema() {
  return {
    accounts: {
      doctype: DOCTYPE_ACCOUNTS,
      doctypeVersion: DOCTYPE_ACCOUNTS_VERSION
    },
    contacts: {
      doctype: DOCTYPE_CONTACTS,
      doctypeVersion: DOCTYPE_CONTACTS_VERSION
    },
    contactsAccounts: {
      doctype: DOCTYPE_CONTACTS_ACCOUNT,
      doctypeVersion: DOCTYPE_CONTACTS_ACCOUNT_VERSION
    }
  }
}

function initCozyClient(accountId) {
  const environment =
    process.env.NODE_ENV === 'none' ? 'production' : process.env.NODE_ENV
  try {
    const uri = getCozyUrl(environment)
    const token = getAccessToken(environment)
    const appMetadata = {
      slug: APP_NAME,
      sourceAccount: accountId,
      version: APP_VERSION
    }
    const schema = getSchema()
    return new CozyClient({ uri, token, appMetadata, schema })
  } catch (err) {
    log('error', 'Unable to initialize cozy client')
    throw err
  }
}

class CozyUtils {
  constructor(accountId) {
    this.client = initCozyClient(accountId)
  }

  prepareIndex(contactAccountId) {
    return this.client
      .collection(DOCTYPE_CONTACTS)
      .createIndex([`cozyMetadata.sync.${contactAccountId}.id`])
  }

  async getUpdatedContacts(contactAccount) {
    const { id: contactAccountId, lastSync, shouldSyncOrphan } = contactAccount
    let allContacts = []
    log('info', 'Get updated Cozy contacts: start')
    const contactsCollection = this.client.collection(DOCTYPE_CONTACTS)
    let hasMore = true
    while (hasMore) {
      const query = {
        cozyMetadata: {
          updatedAt: {
            $gt: lastSync
          }
        }
      }
      if (shouldSyncOrphan) {
        // TODO: also retrieve orphans
        query.relationships = {
          accounts: {
            data: {
              $elemMatch: {
                _id: contactAccountId
              }
            }
          }
        }
      } else {
        query.relationships = {
          accounts: {
            data: {
              $elemMatch: {
                _id: contactAccountId
              }
            }
          }
        }
      }

      log('info', 'Get updated Cozy contacts: ask for more contacts')
      const resp = await contactsCollection.find(query, {
        indexedFields: ['cozyMetadata.updatedAt']
      })
      allContacts = [...allContacts, ...resp.data]
      hasMore = resp.next
    }

    log('info', 'Get updated Cozy contacts: done')
    return allContacts
  }

  /*
    Update io.cozy.accounts auth.accountName field
  */
  async updateAccountName(accountId, email) {
    const accountsCollection = this.client.collection(DOCTYPE_ACCOUNTS)
    try {
      const resp = await accountsCollection.get(accountId)
      const account = resp.data
      await this.save({
        ...account,
        auth: {
          ...account.auth,
          accountName: email
        }
      })
    } catch (err) {
      // don't crash if account email can't be set
      log(
        'warn',
        `Error while trying to update accountName (for ${accountId}): ${
          err.message
        }`
      )
    }
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

  async findContactAccount(accountId) {
    const accountsCollection = this.client.collection(DOCTYPE_CONTACTS_ACCOUNT)
    const result = await accountsCollection.find({
      sourceAccount: accountId
    })

    return get(result.data, 0, null)
  }

  async findOrCreateContactAccount(accountId, accountEmail) {
    const accountsCollection = this.client.collection(DOCTYPE_CONTACTS_ACCOUNT)
    const accountsWithSourceAccount = await accountsCollection.find({
      sourceAccount: accountId
    })

    if (accountsWithSourceAccount.data.length > 0) {
      return accountsWithSourceAccount.data[0]
    } else {
      let accountDoc = {
        canLinkContacts: true,
        shouldSyncOrphan: SHOULD_SYNC_ORPHAN_DEFAULT_VALUE,
        lastSync: null,
        lastLocalSync: null,
        name: accountEmail,
        _type: DOCTYPE_CONTACTS_ACCOUNT,
        type: APP_NAME,
        sourceAccount: accountId,
        version: 1
      }

      // maybe the connector has been run with the same google account in the past, but had been disconnected and is now reconnected. In that case we want to avoid duplicates, so we look for previous references to this google email.
      const accountsWithEmail = await accountsCollection.find({
        name: accountEmail
      })

      if (accountsWithEmail.data.length > 0) {
        if (accountsWithEmail.data.length > 1) {
          log(
            'info',
            `Found more than one io.cozy.contacts.accounts with the email ${accountEmail} — using the first one.`
          )
        }
        accountDoc._id = accountsWithEmail.data[0]._id
        accountDoc._rev = accountsWithEmail.data[0]._rev
      }

      const resp = await this.client.save(accountDoc)
      return resp.data
    }
  }

  save(params) {
    return this.client.save(params)
  }
}

module.exports = CozyUtils
