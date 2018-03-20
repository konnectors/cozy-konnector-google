const { BaseKonnector, addData } = require('cozy-konnector-libs')
const googleHelper = require('./google')
const transpile = require('./transpiler')

module.exports = new BaseKonnector(withFakeFields(start))

function withFakeFields(callback) {
  return function(fields) {
    // googleHelper.resetConfigStore();
    return googleHelper.getTokens().then(callback)
  }
}

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
async function start(fields) {
  const oAuth2Client = googleHelper.oAuth2Client
  oAuth2Client.setCredentials({
    access_token: fields.access_token,
    refresh_token: fields.refresh_token
  })

  try {
    const contacts = await googleHelper.getAllContacts({
      personFields: FIELDS.join(',')
    })
    addData(contacts.map(transpile.toCozy), 'io.cozy.contacts')
  } catch (err) {
    throw new Error('a global konnector error', err)
  }
}
