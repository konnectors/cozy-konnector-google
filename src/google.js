const { google } = require('googleapis')
const OAuth2Client = google.auth.OAuth2

module.exports = (() => ({
  oAuth2Client: this.oAuth2Client || new OAuth2Client(),
  getAccountInfo: function({ personFields = ['names'] }) {
    const peopleAPI = google.people({
      version: 'v1',
      auth: this.oAuth2Client
    })

    return new Promise((resolve, reject) => {
      peopleAPI.people.get(
        {
          resourceName: 'people/me',
          personFields
        },
        (err, res) => {
          if (err) {
            reject(err)
          } else {
            resolve(res.data)
          }
        }
      )
    })
  },
  getConnectionsList: function({ personFields = ['names'], ...options }) {
    const peopleAPI = google.people({
      version: 'v1',
      auth: this.oAuth2Client
    })
    return new Promise((resolve, reject) => {
      peopleAPI.people.connections.list(
        { resourceName: 'people/me', personFields, ...options },
        (err, res) => {
          if (err) {
            reject(err)
          } else {
            resolve(res.data)
          }
        }
      )
    })
  },
  getAllContacts: async function({
    personFields = ['names'],
    pageToken = null,
    syncToken = null
  }) {
    try {
      const call = await this.getConnectionsList({
        personFields,
        pageToken,
        requestSyncToken: true,
        syncToken
      })
      if (call.connections == null || call.connections.length === 0)
        return {
          contacts: [],
          nextSyncToken: call.nextSyncToken
        }
      if (call.nextPageToken) {
        const nextPageResult = await this.getAllContacts({
          personFields,
          pageToken: call.nextPageToken,
          requestSyncToken: true,
          syncToken
        })
        return {
          contacts: [...call.connections, ...nextPageResult.contacts],
          nextSyncToken: nextPageResult.nextSyncToken
        }
      } else {
        return {
          contacts: call.connections,
          nextSyncToken: call.nextSyncToken
        }
      }
    } catch (err) {
      throw new Error(`Unable to get all contacts: ${err.message}`)
    }
  },
  createContact: function(person) {
    const peopleAPI = google.people({
      version: 'v1',
      auth: this.oAuth2Client
    })

    try {
      return peopleAPI.people.createContact({
        parent: 'people/me',
        requestBody: person
      })
    } catch (err) {
      throw new Error(`Unable to create contact ${err.message}`)
    }
  }
}))()
