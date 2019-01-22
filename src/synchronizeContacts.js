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
        if (shouldSave(remoteContact)) {
          const resp = await save(localContact)
          const afterSaveResp = await afterSave(localContact, resp.data)
          return {
            created: true,
            id: afterSaveResp.data.id
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
