const manifestInfos = require('../manifest.konnector')

const ADD_COZY_METADATA = true
const APP_NAME = `konnector-${manifestInfos.slug}`
const APP_VERSION = manifestInfos.version
const DOCTYPE_CONTACTS = 'io.cozy.contacts'
const DOCTYPE_CONTACTS_ACCOUNT = 'io.cozy.contacts.accounts'
const DOCTYPE_CONTACTS_VERSION = 2

module.exports = {
  ADD_COZY_METADATA,
  APP_NAME,
  APP_VERSION,
  DOCTYPE_CONTACTS,
  DOCTYPE_CONTACTS_ACCOUNT,
  DOCTYPE_CONTACTS_VERSION
}
