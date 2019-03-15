process.env.SENTRY_DSN =
  process.env.SENTRY_DSN ||
  'https://9dc00d3182b045f896fadac8ffc97089:7568fbfd62304a69bdb29705b3ea8d04@sentry.cozycloud.cc/45'

const {
  BaseKonnector,
  cozyClient,
  log,
  errors
} = require('cozy-konnector-libs')

const CozyUtils = require('./CozyUtils')
const GoogleUtils = require('./GoogleUtils')
const getAccountId = require('./helpers/getAccountId')
const synchronizeContacts = require('./synchronizeContacts')

module.exports = new BaseKonnector(start)

/**
 * @param  {} fields:
 * @param {} fields.access_token: a google access token
 * @param {} fields.refresh_token: a google refresh token
 */
async function start(fields, doRetry = true) {
  log('info', 'Starting the google connector')

  const accountId = getAccountId()
  try {
    const cozyUtils = new CozyUtils(accountId)
    const googleUtils = new GoogleUtils()
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
      accountId,
      accountEmail
    )

    log('info', 'Getting all the contacts')
    const [
      { contacts: googleContacts, nextSyncToken: syncTokenBefore },
      cozyContacts
    ] = await Promise.all([
      googleUtils.getAllContacts({
        syncToken: contactAccount.syncToken // only contacts that have been modified since last sync
      }),
      cozyUtils.getUpdatedContacts(contactAccount)
    ])

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

    // update the contact account
    const lastLocalSync = new Date().toISOString()
    let nextSyncToken = syncTokenBefore
    // if we changed something on google, we have to ask for a new sync token
    if (Object.values(result.google).some(v => v !== 0)) {
      const response = await googleUtils.getAllContacts({
        syncToken: syncTokenBefore
      })
      nextSyncToken = response.nextSyncToken
      const contactsWeUpdated = result.google.created + result.google.updated
      if (response.contacts.length !== contactsWeUpdated) {
        log(
          'warn',
          'User has created/updated contacts on google during the synchronization ' +
            '(some cozy changes may be lost next time).'
        )
      }
    }
    const lastGoogleSync = new Date().toISOString()

    await cozyUtils.save({
      ...contactAccount,
      lastSync: lastGoogleSync,
      lastLocalSync: lastLocalSync,
      syncToken: nextSyncToken
    })

    log(
      'info',
      `${result.cozy.created} created / ${result.cozy.updated} updated / ${
        result.cozy.deleted
      } deleted contacts on Cozy for ${accountEmail}`
    )
    log(
      'info',
      `${result.google.created} created / ${result.google.updated} updated / ${
        result.google.deleted
      } deleted contacts on Google for ${accountEmail}`
    )
    log('info', 'Sync has completed successfully')
  } catch (err) {
    if (err.code === 401 || err.code === 403) {
      if (
        err.message === 'Request had insufficient authentication scopes.' ||
        err.message.match(/Request requires one of the following scopes/)
      ) {
        log('info', 'insufficient scopes')
        throw errors.USER_ACTION_NEEDED_OAUTH_OUTDATED
      } else if (
        err.message === 'No refresh token is set.' ||
        err.message === 'Invalid Credentials'
      ) {
        if (!fields.refresh_token) {
          log('info', 'no refresh token found')
          throw errors.USER_ACTION_NEEDED_OAUTH_OUTDATED
        } else if (doRetry) {
          log('info', 'asking refresh from the stack')
          let body
          try {
            body = await cozyClient.fetchJSON(
              'POST',
              `/accounts/google/${accountId}/refresh`
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
        log('error', `Error during authentication ${err.message}`)
        throw errors.VENDOR_DOWN
      }
    } else {
      log('error', 'caught an unexpected error')
      log('error', err.message)
      throw errors.VENDOR_DOWN
    }
  }
}
