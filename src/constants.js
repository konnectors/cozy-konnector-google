const manifestInfos = require('../manifest.konnector')

const APP_NAME = `konnector-${manifestInfos.slug}`
const APP_VERSION = manifestInfos.version

const DOCTYPE_ACCOUNTS = 'io.cozy.accounts'
const DOCTYPE_ACCOUNTS_VERSION = 1
const DOCTYPE_CONTACTS = 'io.cozy.contacts'
const DOCTYPE_CONTACTS_ACCOUNT = 'io.cozy.contacts.accounts'
const DOCTYPE_CONTACTS_VERSION = 2
const DOCTYPE_CONTACTS_ACCOUNT_VERSION = 1
const SHOULD_SYNC_ORPHAN_DEFAULT_VALUE = true

module.exports = {
  APP_NAME,
  APP_VERSION,
  DOCTYPE_ACCOUNTS,
  DOCTYPE_ACCOUNTS_VERSION,
  DOCTYPE_CONTACTS,
  DOCTYPE_CONTACTS_ACCOUNT,
  DOCTYPE_CONTACTS_VERSION,
  DOCTYPE_CONTACTS_ACCOUNT_VERSION,
  SHOULD_SYNC_ORPHAN_DEFAULT_VALUE
}
