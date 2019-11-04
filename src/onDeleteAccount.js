const { log } = require('cozy-konnector-libs')
const pLimit = require('p-limit')

const getAccountId = require('./helpers/getAccountId')
const CozyUtils = require('./CozyUtils')

async function onDeleteAccount(accountId, cozyUtils) {
  log('info', 'onDeleteAccount: remove account id from the contact account')

  const contactAccount = await cozyUtils.findContactAccount(accountId)
  if (contactAccount) {
    contactAccount.sourceAccount = null
    await cozyUtils.save(contactAccount)

    // also remove all trashed contacts linked to this account
    log(
      'info',
      'onDeleteAccount: remove all trashed contacts linked to this account'
    )
    const trashedContacts = await cozyUtils.getTrashedContacts(
      contactAccount.id
    )

    const limit = pLimit(50)
    const destroyPromises = trashedContacts.map(contact => () =>
      cozyUtils.client.destroy(contact)
    )

    log('info', `'Will delete ${trashedContacts.length} contacts.`)
    try {
      await Promise.all(destroyPromises.map(limit))
    } catch (err) {
      log(
        'error',
        `Error encountered while deleting trashed contacts: ${err.message}`
      )
      throw err
    }
  }
}

const accountId = getAccountId()
const cozyUtils = new CozyUtils(accountId)
onDeleteAccount(accountId, cozyUtils).then(
  () => {
    log(
      'info',
      'onDeleteAccount: Successfully marked the io.cozy.contacts.accounts as inactive'
    )
  },
  err => {
    log(
      'error',
      `onDeleteAccount: An error occured during onDeleteAccount script: ${err.message}`
    )
  }
)

module.exports = { onDeleteAccount }
