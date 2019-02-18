const get = require('lodash/get')
const union = require('lodash/union')

const { DOCTYPE_CONTACTS, APP_NAME } = require('./constants')
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

const findCozyContactForAccount = (
  googleContact,
  cozyContacts,
  contactAccountId
) => {
  return cozyContacts.find(
    contact =>
      get(contact, ['cozyMetadata', 'sync', contactAccountId, 'id']) ===
      googleContact.resourceName
  )
}

const updateCozyMetadata = (
  cozyContact,
  etag,
  resourceName,
  contactAccountId
) => {
  const now = new Date().toISOString()
  const updatedByApps = union(
    get(cozyContact, 'cozyMetadata.updatedByApps', []),
    [APP_NAME]
  )

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

const shouldCreateOnGoogle = (cozyContact, contactAccountId) => {
  return (
    !cozyContact.cozyMetadata.sync ||
    cozyContact.cozyMetadata.sync[contactAccountId] === undefined
  )
}

const shouldCreateOnCozy = (cozyContact, googleContact) =>
  !cozyContact && !get(googleContact, ['metadata', 'deleted'], false)

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
    await Promise.all(
      cozyContacts.map(async cozyContact => {
        const googleContact = await findGoogleContactForAccount(
          cozyContact,
          googleContacts,
          contactAccountId
        ) // TODO also query the remote if not in googleContacts

        let mergedContact = mergeContact(
          cozyContact,
          googleContact,
          contactAccountId
        )

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
          contactAccountId
        ) // TODO also query the remote?

        let mergedContact = mergeContact(
          cozyContact,
          googleContact,
          contactAccountId
        )

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
          await cozyUtils.client.save(mergedContact)
          result.cozy.created++
        }
        // else if (hasRevChanged(mergedContact, cozyContact, contactAccountId)) {
        //   await cozyUtils.client.save(mergedContact)
        // }
        // if (shouldDeleteOnCozy(mergedContact, googleContact)) {
        //   // a voir s'il faut pas mettre le flg deleted
        //   cozyUtils.client.delete(mergedContact)
        // }
      })
    )
    return result
  } catch (err) {
    throw new Error(`Unable to synchronize contacts: ${err.message}`)
  }
}

module.exports = synchronizeContacts
