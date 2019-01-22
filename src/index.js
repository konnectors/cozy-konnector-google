process.env.SENTRY_DSN =
  process.env.SENTRY_DSN ||
  'https://9dc00d3182b045f896fadac8ffc97089:7568fbfd62304a69bdb29705b3ea8d04@sentry.cozycloud.cc/45'

const {
  BaseKonnector,
  cozyClient,
  log,
  errors
} = require('cozy-konnector-libs')
const CozyClient = require('cozy-client').default

const getCozyToGoogleStrategy = require('./getCozyToGoogleStrategy')
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

function initCozyClient() {
  const cozyCredentials = JSON.parse(process.env.COZY_CREDENTIALS)
  return new CozyClient({
    uri: process.env.COZY_URL,
    token: cozyCredentials.token.accessToken
  })
}

async function getAllContacts(client) {
  let allContacts = []
  const DOCTYPE_CONTACTS = 'io.cozy.contacts'
  const contactsCollection = client.collection(DOCTYPE_CONTACTS)
  let hasMore = true
  while (hasMore) {
    const resp = await contactsCollection.all()
    allContacts = [...allContacts, ...resp.data]
    hasMore = resp.next
  }

  return allContacts
}

/**
 * @param  {} fields:
 * @param {} fields.access_token: a google access token
 * @param {} fields.refresh_token: a google refresh token
 */
async function start(fields, doRetry = true) {
  log('info', 'Starting the google connector')
  try {
    google.oAuth2Client.setCredentials({
      access_token: fields.access_token
    })

    log('info', 'Getting accounts infos')
    const accountInfo = await google.getAccountInfo({
      personFields: 'emailAddresses'
    })
    log('info', 'Getting all the contacts')
    const googleContacts = await google.getAllContacts({
      personFields: FIELDS.join(',')
    })

    const client = initCozyClient()
    const cozyContacts = await getAllContacts(client)

    // sync cozy -> google
    const strategy = getCozyToGoogleStrategy(client, google)
    const syncResponse = await synchronizeContacts(
      cozyContacts,
      googleContacts,
      strategy
    )

    if (syncResponse.some(result => result && result.created)) {
      log(
        'info',
        `Created Google contacts for ${accountInfo.emailAddresses[0].value}`
      )
    }
  } catch (err) {
    if (
      err.message === 'No refresh token is set.' ||
      err.message === 'Invalid Credentials'
    ) {
      if (!fields.refresh_token) {
        log('info', 'no refresh token found')
        throw new Error('USER_ACTION_NEEDED.OAUTH_OUTDATED')
      } else if (doRetry) {
        const accountID = JSON.parse(process.env.COZY_FIELDS).account
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
