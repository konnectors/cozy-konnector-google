const { log } = require('cozy-konnector-libs')

const getAccountId = require('./helpers/getAccountId')
const CozyUtils = require('./CozyUtils')

async function onDeleteAccount() {
  log('info', 'onDeleteAccount: remove account id from the contact account')
  const accountId = getAccountId()
  const cozyUtils = new CozyUtils(accountId)
  const contactAccount = await cozyUtils.findContactAccount(accountId)
  if (contactAccount) {
    contactAccount.sourceAccount = null
    await cozyUtils.client.save(contactAccount)
  }
}

onDeleteAccount().then(
  () => {
    log(
      'info',
      'onDeleteAccount: Successfully marked the io.cozy.contacts.accounts as inactive'
    )
  },
  err => {
    log(
      'error',
      `onDeleteAccount: An error occured during onDeleteAccount script: ${
        err.message
      }`
    )
  }
)
