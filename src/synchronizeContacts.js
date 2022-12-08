const get = require('lodash/get')
const uniqBy = require('lodash/uniqBy')
const sortBy = require('lodash/sortBy')
const pLimit = require('p-limit')
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
  } else {
    log(
      'info',
      'Cannot determine action on Cozy.\ncozyContact: ' +
        JSON.stringify(cozyContact) +
        '\ngoogleContact: ' +
        JSON.stringify(googleContact)
    )
  }
}

const determineActionOnGoogle = (cozyContact, contactAccountId) => {
  const syncInfo = get(cozyContact, `cozyMetadata.sync.${contactAccountId}`)
  const isTrashedOnCozy = cozyContact.trashed
  const sortedLastUpdates = sortBy(
    get(cozyContact, 'cozyMetadata.updatedByApps', []),
    'date'
  ).reverse()
  const lastUpdatedBy = get(sortedLastUpdates, '[0].slug')

  if (isTrashedOnCozy) {
    return SHOULD_DELETE
  } else if (!syncInfo) {
    return SHOULD_CREATE
  } else if (lastUpdatedBy !== APP_NAME) {
    // If the last update is from us, we don't need to push the contact to google again.
    // We can only do this as long as a same contact is not synced with 2 google accounts.
    return SHOULD_UPDATE
  } else {
    log(
      'info',
      `No action on Google.\ncozyContact: ${JSON.stringify(cozyContact)}`
    )
    return null
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
      deleted: 0,
      skipped: 0
    },
    cozy: {
      created: 0,
      updated: 0,
      deleted: 0
    }
  }
  const limit = pLimit(50)
  try {
    await cozyUtils.prepareIndex(contactAccountId)

    const googleToCozyPromises = googleContacts.map(
      googleContact => async () => {
        log(
          'info',
          `Synchronize google contact to cozy: ${googleContact.resourceName} (active: ${limit.activeCount}, pending: ${limit.pendingCount})`
        )
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

        log('info', `Action on ${googleContact.resourceName}: ${action}`)
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
          result.cozy.created++
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
          result.cozy.updated++
        } else if (action === SHOULD_DELETE) {
          await cozyUtils.client.destroy(cozyContact)
          result.cozy.deleted++
        }
      }
    )

    log('info', '[start] Synchronize Google contacts to Cozy')
    await Promise.all(googleToCozyPromises.map(limit))
    log('info', '[end] Synchronize Google contacts to Cozy')

    // remove from cozy contacts the contacts that have been updated by previous loop
    const countBefore = cozyContacts.length
    // eslint-disable-next-line no-param-reassign
    cozyContacts = cozyContacts.filter(
      cozyContact =>
        !googleContacts.some(
          googleContact =>
            googleContact.resourceName ===
            get(cozyContact, `cozyMetadata.sync.${contactAccountId}.id`, '')
        )
    )
    const removedCount = countBefore - cozyContacts.length
    log(
      'info',
      `Removed ${removedCount} contacts from cozyContacts to avoid conflicts`
    )

    const cozyToGooglePromises = cozyContacts.map(cozyContact => async () => {
      log(
        'info',
        `Synchronize cozy contact to google: ${cozyContact.id} (active: ${limit.activeCount}, pending: ${limit.pendingCount})`
      )

      const googleContact = await findGoogleContactForAccount(
        cozyContact,
        googleContacts,
        contactAccountId
      )

      let mergedContact = mergeContact(cozyContact, googleContact, {
        preferGoogle: false
      })
      const action = determineActionOnGoogle(cozyContact, contactAccountId)
      log('info', `Action on ${cozyContact.id}: ${action}`)
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
      } else if (action === SHOULD_UPDATE) {
        const { remoteRev, id: resourceName } = cozyContact.cozyMetadata.sync[
          contactAccountId
        ]
        // fallback when remoteRev is undefined after migration
        const etag = remoteRev
          ? remoteRev
          : get(mergedContact, 'metadata.google.metadata.sources.0.etag')
        if (etag) {
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
            if (err.code === 404) {
              log('info', `Entity not found on google: ${resourceName}`)
            } else if (
              err.message.includes(
                'Request person.etag is different than the current person.etag'
              )
            ) {
              try {
                // verify if the contact has not been deleted or hidden on Google
                const googleContact = await googleUtils.getContact(resourceName)
                const debugInfos = {
                  id: cozyContact.id,
                  resourceName: get(googleContact, 'resourceName'),
                  etag,
                  googleMetadata: get(googleContact, 'metadata'),
                  oldGoogleMetadata: get(
                    mergedContact,
                    'metadata.google.metadata'
                  ),
                  cozyMetadata: get(mergedContact, 'cozyMetadata')
                }
                log(
                  'error',
                  'Google contact exists but etag is not valid: ' +
                    JSON.stringify(debugInfos)
                )
                throw new Error(
                  'Contact exists on Google but etag is not valid anymore!'
                )
              } catch (err) {
                if (err.code === 404) {
                  log(
                    'info',
                    'Contact does not exist anymore on Google, remove it from cozy'
                  )
                  await cozyUtils.client.destroy(cozyContact)
                  result.cozy.deleted++
                } else {
                  throw err
                }
              }
            } else {
              throw err
            }
          }
        } else {
          log(
            'error',
            `Unable to update contact, no etag: ${JSON.stringify(
              mergedContact
            )}`
          )
        }
      } else {
        result.google.skipped++
      }

      if (hasRevChanged(mergedContact, cozyContact, contactAccountId)) {
        // we only update the sync metadata here so we don't count it as created/updated
        await cozyUtils.client.save(mergedContact)
      }
    })

    log('info', '[start] Synchronize Cozy contacts to Google')
    await Promise.all(cozyToGooglePromises.map(limit))
    log('info', '[end] Synchronize Cozy contacts to Google')

    return result
  } catch (err) {
    log('error', `Error during sync: ${err.message}`)
    if (/Quota exceeded/.test(err.message)) {
      log('info', 'Shutting down because the Google request quota was reached.')
      log(
        'info',
        `Contacts processed before reaching the quota this run: ${result.google.skipped} skipped | ${result.google.created} created | ${result.google.updated} updated | ${result.google.deleted} deleted`
      )
    }
    throw new Error(`Unable to synchronize contacts: ${err.message}`)
  }
}

module.exports = synchronizeContacts
