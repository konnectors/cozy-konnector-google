const { BaseKonnector, updateOrCreate } = require('cozy-konnector-libs')
const googleHelper = require('./google')
const transpile = require('./transpiler')

// module.exports = new BaseKonnector(withFakeFields(start))
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
async function start(fields) {
  googleHelper.oAuth2Client.setCredentials({
    access_token: fields.access_token,
    refresh_token: fields.refresh_token
  })

  try {
    const accountInfo = await googleHelper.getAccountInfo()
    const contacts = await googleHelper.getAllContacts({
      personFields: FIELDS.join(',')
    })
    const ioCozyContacts = contacts.map(transpile.toCozy).map(contact => ({
      ...contact,
      metadata: {
        google: {
          ...contact.metadata['google'],
          from: accountInfo.emails[0].value
        }
      }
    }))
    return updateOrCreate(ioCozyContacts, 'io.cozy.contacts', ['resourceName'])
  } catch (err) {
    throw new Error(`a global konnector error: ${err.message}`)
  }
}
