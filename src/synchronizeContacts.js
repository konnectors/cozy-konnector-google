const get = require('lodash/get')
const uniqBy = require('lodash/uniqBy')
// const without = require('lodash/without')
const { log } = require('cozy-konnector-libs')

const {
  DOCTYPE_CONTACTS,
  DOCTYPE_CONTACTS_ACCOUNT,
  APP_NAME
} = require('./constants')
const mergeContact = require('./mergeContact')
const transpiler = require('./transpiler')

const findGoogleContactForAccount = async (
  cozyContact,
  googleContacts,
  contactAccountId
) => {
  const resourceName = get(
    cozyContact,
    ['cozyMetadata', 'sync', contactAccountId, 'id'],
    null
  )

  if (!resourceName) return undefined

  const contact = googleContacts.find(
    googleContact => googleContact.resourceName === resourceName
  )

  return contact
}

const findCozyContactForAccount = async (
  googleContact,
  cozyContacts,
  contactAccountId,
  cozyUtils
) => {
  // search in edited cozy contacts
  let cozyContact = cozyContacts.find(
    contact =>
      get(contact, ['cozyMetadata', 'sync', contactAccountId, 'id']) ===
      googleContact.resourceName
  )
  if (!cozyContact) {
    // search in non edited cozy contacts
    cozyContact = await cozyUtils.findContact(
      contactAccountId,
      googleContact.resourceName
    )
  }

  return cozyContact
}

const updateCozyMetadata = (
  cozyContact,
  etag,
  resourceName,
  contactAccountId
) => {
  const now = new Date().toISOString()
  return {
    ...cozyContact,
    cozyMetadata: {
      ...cozyContact.cozyMetadata,
      sync: {
        [contactAccountId]: {
          konnector: APP_NAME,
          lastSync: now,
          remoteRev: etag,
          id: resourceName,
          contactsAccountsId: contactAccountId
        }
      }
    }
  }
}

const updateAccountsRelationship = (contact, contactAccountId) => ({
  ...contact,
  relationships: {
    ...contact.relationships,
    accounts: {
      data: uniqBy(
        [
          ...get(contact, 'relationships.accounts.data', []),
          {
            _id: contactAccountId,
            _type: DOCTYPE_CONTACTS_ACCOUNT
          }
        ],
        account => account._id
      )
    }
  }
})

const SHOULD_CREATE = 'create'
const SHOULD_UPDATE = 'update'
const SHOULD_DELETE = 'delete'

const determineActionOnCozy = (
  cozyContact,
  googleContact,
  contactAccountId
) => {
  const isGoogleContactDeleted = get(
    googleContact,
    ['metadata', 'deleted'],
    false
  )

  const cozyEtag = get(
    cozyContact,
    `cozyMetadata.sync.${contactAccountId}.remoteRev`
  )
  const googleEtag = googleContact.etag

  if (!cozyContact && !isGoogleContactDeleted) {
    return SHOULD_CREATE
  } else if (cozyEtag !== googleEtag && !isGoogleContactDeleted) {
    return SHOULD_UPDATE
  } else if (cozyContact && isGoogleContactDeleted) {
    return SHOULD_DELETE
  }
}

const determineActionOnGoogle = (cozyContact, contactAccountId) => {
  const syncInfo = get(cozyContact, `cozyMetadata.sync.${contactAccountId}`)
  const isTrashedOnCozy = cozyContact.trashed

  if (isTrashedOnCozy) {
    return SHOULD_DELETE
  } else if (!syncInfo) {
    return SHOULD_CREATE
  } else {
    return SHOULD_UPDATE
  }
}

const hasRevChanged = (mergedContact, cozyContact, contactAccountId) => {
  const cozyRev = get(cozyContact, [
    'cozyMetadata',
    'sync',
    contactAccountId,
    'remoteRev'
  ])
  const mergedRev = get(mergedContact, [
    'cozyMetadata',
    'sync',
    contactAccountId,
    'remoteRev'
  ])

  return mergedRev !== cozyRev
}

const synchronizeContacts = async (
  contactAccountId,
  cozyContacts,
  googleContacts,
  cozyUtils,
  googleUtils
) => {
  const result = {
    google: {
      created: 0,
      updated: 0,
      deleted: 0
    },
    cozy: {
      created: 0,
      updated: 0,
      deleted: 0
    }
  }
  try {
    await cozyUtils.prepareIndex(contactAccountId)
    const PromisePool = require('es6-promise-pool')
    const POOL_SIZE = 3

    const generateGoogleToCozy = function*(googleContacts) {
      for (const googleContact of googleContacts) {
        yield async function() {
          let cozyContact = await findCozyContactForAccount(
            googleContact,
            cozyContacts,
            contactAccountId,
            cozyUtils
          )

          let mergedContact = mergeContact(cozyContact, googleContact)
          const action = determineActionOnCozy(
            cozyContact,
            googleContact,
            contactAccountId
          )

          if (action === SHOULD_CREATE) {
            mergedContact = {
              ...mergedContact,
              _type: DOCTYPE_CONTACTS,
              cozyMetadata: {
                sync: {
                  [contactAccountId]: {
                    konnector: APP_NAME,
                    lastSync: new Date().toISOString(),
                    remoteRev: googleContact.etag,
                    id: googleContact.resourceName,
                    contactsAccountsId: contactAccountId
                  }
                }
              }
            }
            mergedContact = updateAccountsRelationship(
              mergedContact,
              contactAccountId
            )
            await cozyUtils.client.save(mergedContact)
            // result.cozy.created++
          } else if (action === SHOULD_UPDATE) {
            mergedContact = updateCozyMetadata(
              mergedContact,
              googleContact.etag,
              googleContact.resourceName,
              contactAccountId
            )
            mergedContact = updateAccountsRelationship(
              mergedContact,
              contactAccountId
            )
            await cozyUtils.client.save(mergedContact)
            // result.cozy.updated++
          } else if (action === SHOULD_DELETE) {
            await cozyUtils.client.destroy(cozyContact)
            // result.cozy.deleted++
          }

          /********************* TODO ***********************/
          // avoid conflicts: remove the contact from cozyContacts
          // TODO: filter these contacts when we migrate cozyContacts
          // cozyContacts = without(cozyContacts, cozyContact)
          /********************* TODO ***********************/
        }
      }
    }

    const googleToCozyIterator = generateGoogleToCozy(googleContacts)
    const googleToCozyPool = new PromisePool(googleToCozyIterator, POOL_SIZE)
    await googleToCozyPool.start()

    const generateCozyToGoogle = function*(cozyContacts) {
      for (const cozyContact of cozyContacts) {
        yield async function() {
          const googleContact = await findGoogleContactForAccount(
            cozyContact,
            googleContacts,
            contactAccountId
          )

          let mergedContact = mergeContact(cozyContact, googleContact, {
            preferGoogle: false
          })
          const action = determineActionOnGoogle(cozyContact, contactAccountId)

          if (action === SHOULD_CREATE) {
            const createdContact = await googleUtils.createContact(
              transpiler.toGoogle(mergedContact)
            )
            const { etag, resourceName } = createdContact
            mergedContact = updateCozyMetadata(
              mergedContact,
              etag,
              resourceName,
              contactAccountId
            )
            mergedContact = updateAccountsRelationship(
              mergedContact,
              contactAccountId
            )
            result.google.created++
          } else if (action === SHOULD_DELETE) {
            const resourceName = get(cozyContact, [
              'cozyMetadata',
              'sync',
              contactAccountId,
              'id'
            ])

            if (resourceName) {
              try {
                await googleUtils.deleteContact(resourceName)
                result.google.deleted++
              } catch (err) {
                if (err.code !== 404) {
                  throw err
                } else {
                  log('info', `Entity not found on google: ${resourceName}`)
                }
              }
            }

            await cozyUtils.client.destroy(mergedContact)
            result.cozy.deleted++
          } else {
            // as we only get contacts that have changed, if it's not a creation or deletion, it's an update
            const {
              remoteRev: etag,
              id: resourceName
            } = cozyContact.cozyMetadata.sync[contactAccountId]
            try {
              const updatedContact = await googleUtils.updateContact(
                transpiler.toGoogle(mergedContact),
                resourceName,
                etag
              )

              const { etag: updatedEtag } = updatedContact
              mergedContact = updateCozyMetadata(
                mergedContact,
                updatedEtag,
                resourceName,
                contactAccountId
              )
              result.google.updated++
            } catch (err) {
              if (err.code !== 404) {
                throw err
              } else {
                log('info', `Entity not found on google: ${resourceName}`)
              }
            }
          }

          if (hasRevChanged(mergedContact, cozyContact, contactAccountId)) {
            // we only update the sync metadata here so we don't count it as created/updated
            await cozyUtils.client.save(mergedContact)
          }
        }
      }
    }

    const cozyToGoogleIterator = generateCozyToGoogle(cozyContacts)
    const cozyToGooglePool = new PromisePool(cozyToGoogleIterator, POOL_SIZE)
    await cozyToGooglePool.start()

    return result
  } catch (err) {
    log('error', `Error during sync: ${err.message}`)
    throw new Error(`Unable to synchronize contacts: ${err.message}`)
  }
}

module.exports = synchronizeContacts
