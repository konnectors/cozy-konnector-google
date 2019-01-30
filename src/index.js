process.env.SENTRY_DSN =
  process.env.SENTRY_DSN ||
  'https://9dc00d3182b045f896fadac8ffc97089:7568fbfd62304a69bdb29705b3ea8d04@sentry.cozycloud.cc/45'

const {
  BaseKonnector,
  cozyClient,
  log,
  errors
} = require('cozy-konnector-libs')

const getCozyToGoogleStrategy = require('./getCozyToGoogleStrategy')
const cozyUtils = require('./cozy')
const google = require('./google')
const synchronizeContacts = require('./synchronizeContacts')

module.exports = new BaseKonnector(start)

// see https://developers.google.com/apis-explorer/#search/people/people/v1/people.people.connections.list
// for the personFields's valid values
const FIELDS = [
  'addresses',
  'ageRanges',
  'biographies',
  'birthdays',
  'braggingRights',
  'coverPhotos',
  'emailAddresses',
  'events',
  'genders',
  'imClients',
  'interests',
  'locales',
  'memberships',
  'metadata',
  'names',
  'nicknames',
  'occupations',
  'organizations',
  'phoneNumbers',
  'photos',
  'relations',
  'relationshipInterests',
  'relationshipStatuses',
  'residences',
  'skills',
  'taglines',
  'urls'
]

/**
 * @param  {} fields:
 * @param {} fields.access_token: a google access token
 * @param {} fields.refresh_token: a google refresh token
 */
async function start(fields, doRetry = true) {
  log('info', 'Starting the google connector')
  const accountID =
    process.env.NODE_ENV === 'production'
      ? JSON.parse(process.env.COZY_FIELDS).account
      : 'fakeAccountId'
  try {
    google.oAuth2Client.setCredentials({
      access_token: fields.access_token
    })

    log('info', 'Getting account infos')
    const accountInfo = await google.getAccountInfo({
      personFields: 'emailAddresses'
    })
    const accountEmail = accountInfo.emailAddresses[0].value

    log('info', 'Getting cozy contact account')
    const contactAccount = await cozyUtils.findOrCreateContactAccount(
      accountID,
      accountEmail
    )

    log('info', 'Getting all the contacts')
    const [
      { contacts: googleContacts, nextSyncToken },
      cozyContacts
    ] = await Promise.all([
      google.getAllContacts({
        personFields: FIELDS.join(','),
        syncToken: contactAccount.syncToken // only contacts that have been modified since last sync
      }),
      cozyUtils.getUpdatedContacts(contactAccount.lastSync)
    ])
    const lastGoogleSync = Date.now()

    // sync cozy -> google
    const strategy = getCozyToGoogleStrategy(
      cozyUtils.client,
      google,
      contactAccount.id
    )
    const syncResponse = await synchronizeContacts(
      cozyContacts,
      googleContacts,
      strategy
    )

    if (syncResponse.some(result => result && result.created)) {
      log('info', `Created Google contacts for ${accountEmail}`)
    }

    await cozyUtils.save({
      ...contactAccount,
      lastSync: lastGoogleSync,
      syncToken: nextSyncToken
    })
    log('info', 'Sync has completed successfully')
  } catch (err) {
    if (
      err.message === 'No refresh token is set.' ||
      err.message === 'Invalid Credentials'
    ) {
      if (!fields.refresh_token) {
        log('info', 'no refresh token found')
        throw new Error('USER_ACTION_NEEDED.OAUTH_OUTDATED')
      } else if (doRetry) {
        log('info', 'asking refresh from the stack')
        const body = await cozyClient.fetchJSON(
          'POST',
          `/accounts/google/${accountID}/refresh`
        )
        log('info', 'refresh response')
        log('info', JSON.stringify(body))
        fields.access_token = body.attributes.oauth.access_token
        return start(fields, false)
      }
    } else {
      log('error', 'caught an unexpected error')
      log('error', err.message)
      throw errors.VENDOR_DOWN
    }
  }
}
