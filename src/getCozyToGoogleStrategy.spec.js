const getCozyToGoogleStrategy = require('./getCozyToGoogleStrategy')
const google = require('./google')
const { mockDate, restoreDate } = require('../jestHelpers/mockDate')

jest.mock('./google')

const fakeClient = {
  save: jest.fn()
}

describe('getCozyToGoogleStrategy', () => {
  const SOURCE_ACCOUNT_ID = '119a16a8-9a07-4a05-b06c-849b223e1f97'
  const strategy = getCozyToGoogleStrategy(
    fakeClient,
    google,
    SOURCE_ACCOUNT_ID
  )
  const { findRemoteDocument, save, shouldSave, afterSave } = strategy

  beforeEach(() => {
    mockDate('2018-01-01T12:00:00.210Z')
  })

  afterEach(() => {
    jest.clearAllMocks()
    restoreDate()
  })

  describe('findRemoteDocument', () => {
    it('should search for the remote document', () => {
      const cozyContact = {
        cozyMetadata: {
          sync: {
            [SOURCE_ACCOUNT_ID]: {
              id: 'people/123456'
            }
          }
        }
      }
      const googleContacts = [
        {
          resourceName: 'people/987654',
          names: [
            {
              givenName: 'John',
              familyName: 'Doe'
            }
          ]
        },
        {
          resourceName: 'people/123456',
          names: [
            {
              givenName: 'Jane',
              familyName: 'Doe'
            }
          ]
        }
      ]
      const expected = {
        resourceName: 'people/123456',
        names: [
          {
            givenName: 'Jane',
            familyName: 'Doe'
          }
        ]
      }
      const result = findRemoteDocument(cozyContact, googleContacts)
      expect(result).toEqual(expected)
    })
  })

  describe('shouldSave', () => {
    it('should return true if contact does not have a linked source account yet', () => {
      const cozyContact = {
        cozyMetadata: {
          sync: {}
        }
      }
      const result = shouldSave(cozyContact)
      expect(result).toBe(true)
    })

    it('should return true if contact has no sync metadata', () => {
      const cozyContact = {
        cozyMetadata: {}
      }
      const result = shouldSave(cozyContact)
      expect(result).toBe(true)
    })

    it('should return false if contact has already been synced', () => {
      const cozyContact = {
        cozyMetadata: {
          sync: {
            [SOURCE_ACCOUNT_ID]: {
              id: 'people/123456'
            }
          }
        }
      }
      const result = shouldSave(cozyContact)
      expect(result).toBe(false)
    })
  })

  describe('save', () => {
    it('should transpile and save the contact in google contacts', async () => {
      const cozyContact = {
        name: { givenName: 'John', familyName: 'Doe' }
      }
      await save(cozyContact)
      expect(google.createContact).toHaveBeenCalledWith({
        addresses: [],
        birthdays: [],
        emailAddresses: [],
        names: [
          {
            familyName: 'Doe',
            givenName: 'John'
          }
        ],
        organizations: undefined,
        phoneNumbers: [],
        userDefined: undefined
      })
    })
  })
  describe('afterSave', () => {
    it('should enrich cozy contact with metadata', async () => {
      const cozyContact = {
        id: 'fadb7a06-f027-4f20-abc1-92e7ecdab8c7',
        name: { givenName: 'John', familyName: 'Doe' },
        cozyMetadata: {
          updatedByApps: ['Contacts']
        }
      }
      const googleContact = {
        resourceName: 'people/424242',
        etag: '34f2ee51-5721-46a9-b856-fff6294076f6'
      }
      fakeClient.save.mockResolvedValue({
        data: {
          id: 'fadb7a06-f027-4f20-abc1-92e7ecdab8c7'
        }
      })
      const result = await afterSave(cozyContact, googleContact)
      const expected = {
        cozyMetadata: {
          createdAt: '2018-01-01T12:00:00.210Z',
          createdByApp: 'konnector-google',
          createdByAppVersion: '2.0.0',
          doctypeVersion: 2,
          importedAt: '2018-01-01T12:00:00.210Z',
          importedFrom: 'konnector-google',
          sync: {
            '119a16a8-9a07-4a05-b06c-849b223e1f97': {
              contactsAccountsId: '119a16a8-9a07-4a05-b06c-849b223e1f97',
              id: 'people/424242',
              konnector: 'konnector-google',
              lastSync: '2018-01-01T12:00:00.210Z',
              remoteRev: '34f2ee51-5721-46a9-b856-fff6294076f6'
            }
          },
          updatedAt: '2018-01-01T12:00:00.210Z',
          updatedByApps: ['Contacts', 'konnector-google']
        },
        id: 'fadb7a06-f027-4f20-abc1-92e7ecdab8c7',
        name: { givenName: 'John', familyName: 'Doe' }
      }
      expect(fakeClient.save).toHaveBeenCalledWith(expected)
      expect(result).toEqual('fadb7a06-f027-4f20-abc1-92e7ecdab8c7')
    })
  })
})
