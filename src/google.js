const { google } = require('googleapis')
const OAuth2Client = google.auth.OAuth2

module.exports = (() => ({
  oAuth2Client: this.oAuth2Client || new OAuth2Client(),
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
    pageToken = null
  }) {
    try {
      const call = await this.getConnectionsList({
        personFields,
        pageToken
      })
      if (call.nextPageToken) {
        const nextPageResult = await this.getAllContacts({
          personFields,
          pageToken: call.nextPageToken
        })
        return [...call.connections, ...nextPageResult]
      } else {
        return [...call.connections]
      }
    } catch (err) {
      throw new Error(`Unable to get all contacts: ${err.message}`)
    }
  }
}))()
