const get = require('lodash/get')
const { google } = require('googleapis')
const { log } = require('cozy-konnector-libs')
const OAuth2Client = google.auth.OAuth2

// see https://developers.google.com/apis-explorer/#search/people/people/v1/people.people.connections.list
// for the personFields's valid values
const FIELDS = [
  'addresses',
  'ageRanges',
  'biographies',
  'birthdays',
  'braggingRights',
  'coverPhotos',
  'emailAddresses',
  'events',
  'genders',
  'imClients',
  'interests',
  'locales',
  'memberships',
  'metadata',
  'names',
  'nicknames',
  'occupations',
  'organizations',
  'phoneNumbers',
  'photos',
  'relations',
  'relationshipInterests',
  'relationshipStatuses',
  'residences',
  'skills',
  'taglines',
  'urls'
]

class GoogleUtils {
  constructor() {
    this.oAuth2Client = new OAuth2Client()
  }

  getAccountInfo({ personFields = ['names'] }) {
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
  }

  getConnectionsList(options) {
    const peopleAPI = google.people({
      version: 'v1',
      auth: this.oAuth2Client
    })
    return new Promise((resolve, reject) => {
      peopleAPI.people.connections.list(
        {
          resourceName: 'people/me',
          personFields: FIELDS.join(','),
          ...options
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
  }

  async getAllContacts({ pageToken = null, syncToken = null }) {
    try {
      const call = await this.getConnectionsList({
        pageToken,
        requestSyncToken: true,
        syncToken
      })
      if (call.connections == null || call.connections.length === 0) {
        log('info', 'Get all google contacts: empty')
        return {
          contacts: [],
          nextSyncToken: call.nextSyncToken
        }
      }
      if (call.nextPageToken) {
        log('info', 'Get all google contacts: ask for a next page')
        const nextPageResult = await this.getAllContacts({
          pageToken: call.nextPageToken,
          requestSyncToken: true,
          syncToken
        })
        return {
          contacts: [...call.connections, ...nextPageResult.contacts],
          nextSyncToken: nextPageResult.nextSyncToken
        }
      } else {
        log('info', 'Get all google contacts: last page')
        return {
          contacts: call.connections,
          nextSyncToken: call.nextSyncToken
        }
      }
    } catch (err) {
      throw new Error(`Unable to get all contacts: ${err.message}`)
    }
  }

  async createContact(person) {
    const peopleAPI = google.people({
      version: 'v1',
      auth: this.oAuth2Client
    })

    const response = await peopleAPI.people.createContact({
      parent: 'people/me',
      requestBody: person
    })
    return response.data
  }

  async updateContact(person, resourceName, etag) {
    const peopleAPI = google.people({
      version: 'v1',
      auth: this.oAuth2Client
    })

    try {
      const response = await peopleAPI.people.updateContact({
        resourceName,
        requestBody: {
          ...person,
          etag
        },
        updatePersonFields: Object.keys(person).join(',')
      })

      return response.data
    } catch (err) {
      if (
        err.code === 400 &&
        err.message.includes(
          'Request person.etag is different than the current person.etag'
        )
      ) {
        // ask for the new etag and retry
        const response = await peopleAPI.people.get({
          resourceName,
          personFields: 'names'
        })
        const newEtag = get(response, 'data.etag')
        const newResponse = await peopleAPI.people.updateContact({
          resourceName,
          requestBody: {
            ...person,
            etag: newEtag
          },
          updatePersonFields: Object.keys(person).join(',')
        })

        return newResponse.data
      }
      throw err
    }
  }

  async deleteContact(resourceName) {
    const peopleAPI = google.people({
      version: 'v1',
      auth: this.oAuth2Client
    })

    const response = await peopleAPI.people.deleteContact({
      resourceName
    })
    return response.data
  }
}

module.exports = GoogleUtils
