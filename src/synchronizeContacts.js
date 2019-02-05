const synchronizeContacts = (
  localContacts,
  remoteContacts,
  synchronizationStrategy
) => {
  const {
    afterSave,
    findRemoteDocument,
    save,
    shouldSave
  } = synchronizationStrategy
  try {
    return Promise.all(
      localContacts.map(async localContact => {
        const remoteContact = findRemoteDocument(localContact, remoteContacts)
        if (shouldSave(localContact, remoteContact)) {
          const resp = await save(localContact)
          const createdId = await afterSave(localContact, resp.data)
          return {
            created: true,
            id: createdId
          }
        }

        return null
      })
    )
  } catch (err) {
    throw new Error(`Unable to synchronize contacts: ${err.message}`)
  }
}

module.exports = synchronizeContacts
