process.env.SENTRY_DSN =
  process.env.SENTRY_DSN ||
  'https://9dc00d3182b045f896fadac8ffc97089:7568fbfd62304a69bdb29705b3ea8d04@sentry.cozycloud.cc/45'

const {
  BaseKonnector,
  cozyClient,
  log,
  errors
} = require('cozy-konnector-libs')

const cozyUtils = require('./cozy')
const googleUtils = require('./google')
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
    process.env.NODE_ENV === 'development'
      ? 'fakeAccountId'
      : JSON.parse(process.env.COZY_FIELDS).account

  try {
    googleUtils.oAuth2Client.setCredentials({
      access_token: fields.access_token
    })

    log('info', 'Getting account infos')
    const accountInfo = await googleUtils.getAccountInfo({
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
      googleUtils.getAllContacts({
        personFields: FIELDS.join(','),
        syncToken: contactAccount.syncToken // only contacts that have been modified since last sync
      }),
      cozyUtils.getUpdatedContacts(contactAccount.lastLocalSync)
    ])
    const lastGoogleSync = new Date().toISOString()

    log(
      'info',
      `Try to synchronize ${cozyContacts.length} cozy contacts and ${
        googleContacts.length
      } google contacts`
    )

    const result = await synchronizeContacts(
      contactAccount.id,
      cozyContacts,
      googleContacts,
      cozyUtils,
      googleUtils
    )

    log(
      'info',
      `Created ${result.cozy.created} new Cozy contacts for ${accountEmail}`
    )
    log(
      'info',
      `Created ${result.google.created} new Google contacts for ${accountEmail}`
    )
    log(
      'info',
      `Updated ${result.cozy.updated} Cozy contacts for ${accountEmail}`
    )
    log(
      'info',
      `Updated ${result.google.updated} Google contacts for ${accountEmail}`
    )
    log(
      'info',
      `Deleted ${result.cozy.deleted} Cozy contacts for ${accountEmail}`
    )

    // update the contact account
    const lastLocalSync = new Date().toISOString()
    await cozyUtils.save({
      ...contactAccount,
      lastSync: lastGoogleSync,
      lastLocalSync: lastLocalSync,
      syncToken: nextSyncToken
    })
    log('info', 'Sync has completed successfully')
  } catch (err) {
    if (err.code === 401 || err.code === 403) {
      if (
        err.message === 'Request had insufficient authentication scopes.' ||
        err.message.match(/Request requires one of the following scopes/)
      ) {
        log('info', 'insufficient scopes')
        throw errors.USER_ACTION_NEEDED_OAUTH_OUTDATED
      } else if (!fields.refresh_token) {
        log('info', 'no refresh token found')
        throw errors.USER_ACTION_NEEDED_OAUTH_OUTDATED
      } else if (doRetry) {
        log('info', 'asking refresh from the stack')
        let body
        try {
          body = await cozyClient.fetchJSON(
            'POST',
            `/accounts/google/${accountID}/refresh`
          )
        } catch (err) {
          log('info', `Error during refresh ${err.message}`)
          throw errors.USER_ACTION_NEEDED_OAUTH_OUTDATED
        }

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
