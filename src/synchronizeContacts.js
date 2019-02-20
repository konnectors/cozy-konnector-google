const get = require('lodash/get')
const uniqBy = require('lodash/uniqBy')

const {
  DOCTYPE_CONTACTS,
  DOCTYPE_CONTACTS_ACCOUNT,
  APP_NAME
} = require('./constants')
const getInitialMetadata = require('./getInitialMetadata')
const mergeContact = require('./mergeContact')
const transpiler = require('./transpiler')

const findGoogleContactForAccount = (
  cozyContact,
  googleContacts,
  contactAccountId
) => {
  const resourceName = get(
    cozyContact,
    ['cozyMetadata', 'sync', contactAccountId, 'id'],
    null
  )

  if (resourceName) {
    return googleContacts.find(
      googleContact => googleContact.resourceName === resourceName
    )
  }

  return undefined
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
  const updatedByApps = uniqBy([
    ...get(cozyContact, 'cozyMetadata.updatedByApps', []),
    APP_NAME
  ])

  return {
    ...cozyContact,
    cozyMetadata: {
      ...cozyContact.cozyMetadata,
      updatedAt: now,
      updatedByApps,
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

const shouldCreateOnGoogle = (cozyContact, contactAccountId) => {
  return (
    !cozyContact.cozyMetadata.sync ||
    cozyContact.cozyMetadata.sync[contactAccountId] === undefined
  )
}

const shouldCreateOnCozy = (cozyContact, googleContact) =>
  !cozyContact && !get(googleContact, ['metadata', 'deleted'], false)

const shouldUpdateOnCozy = (cozyContact, googleContact, contactAccountId) =>
  get(cozyContact, `cozyMetadata.sync.${contactAccountId}.remoteRev`) !==
    googleContact.etag && !get(googleContact, ['metadata', 'deleted'])

const shouldDeleteOnCozy = (cozyContact, googleContact) =>
  cozyContact && get(googleContact, ['metadata', 'deleted'])

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
    await Promise.all(
      cozyContacts.map(async cozyContact => {
        const googleContact = await findGoogleContactForAccount(
          cozyContact,
          googleContacts,
          contactAccountId
        )

        let mergedContact = mergeContact(cozyContact, googleContact, {
          preferGoogle: false
        })

        if (shouldCreateOnGoogle(cozyContact, contactAccountId)) {
          const googleResp = await googleUtils.createContact(
            transpiler.toGoogle(mergedContact)
          )
          const { etag, resourceName } = googleResp.data
          mergedContact = updateCozyMetadata(
            mergedContact,
            etag,
            resourceName,
            contactAccountId
          )
          result.google.created++
        } else {
          // as we only get contacts that have changed, if it's not a creation or deletion, it's an update
          const {
            remoteRev: etag,
            id: resourceName
          } = cozyContact.cozyMetadata.sync[contactAccountId]
          const googleResp = await googleUtils.updateContact(
            transpiler.toGoogle(mergedContact),
            resourceName,
            etag
          )
          const { etag: updatedEtag } = googleResp.data
          mergedContact = updateCozyMetadata(
            mergedContact,
            updatedEtag,
            resourceName,
            contactAccountId
          )
          result.google.updated++
        }

        // if (hasDeletedContact(mergedContact, cozyContact)) {
        //   googleUtils.deleteContact(mergedContact)
        //   cozyUtils.delete(mergedContact)
        // }

        if (hasRevChanged(mergedContact, cozyContact, contactAccountId)) {
          // we only update the sync metadata here so we don't count it as created/updated
          await cozyUtils.client.save(mergedContact)
        }
      })
    )

    await Promise.all(
      googleContacts.map(async googleContact => {
        let cozyContact = await findCozyContactForAccount(
          googleContact,
          cozyContacts,
          contactAccountId,
          cozyUtils
        )

        let mergedContact = mergeContact(cozyContact, googleContact)

        if (shouldCreateOnCozy(cozyContact, googleContact)) {
          mergedContact = {
            ...mergedContact,
            _type: DOCTYPE_CONTACTS,
            ...getInitialMetadata(
              googleContact.etag,
              googleContact.resourceName,
              contactAccountId
            )
          }
          mergedContact = updateAccountsRelationship(
            mergedContact,
            contactAccountId
          )
          await cozyUtils.client.save(mergedContact)
          result.cozy.created++
        } else if (
          shouldUpdateOnCozy(cozyContact, googleContact, contactAccountId)
        ) {
          result.cozy.updated++
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
        } else if (shouldDeleteOnCozy(cozyContact, googleContact)) {
          await cozyUtils.client.destroy(cozyContact)
          result.cozy.deleted++
        }
      })
    )
    return result
  } catch (err) {
    throw new Error(`Unable to synchronize contacts: ${err.message}`)
  }
}

module.exports = synchronizeContacts
