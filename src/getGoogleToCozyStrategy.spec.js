const getGoogleToCozyStrategy = require('./getGoogleToCozyStrategy')

const cozyUtils = require('./cozy')
const { mockDate, restoreDate } = require('../jestHelpers/mockDate')

describe('getGoogleToCozyStrategy', () => {
  const SOURCE_ACCOUNT_ID = '119a16a8-9a07-4a05-b06c-849b223e1f97'
  cozyUtils.client.save = jest.fn()
  const strategy = getGoogleToCozyStrategy(cozyUtils, SOURCE_ACCOUNT_ID)
  const { findRemoteDocument, shouldSave, save, afterSave } = strategy

  describe('findRemoteDocument', () => {
    const cozyContacts = [
      {
        name: {
          givenName: 'Jane',
          familyName: 'Doe'
        },
        cozyMetadata: {
          sync: {
            [SOURCE_ACCOUNT_ID]: {
              id: 'people/123456'
            }
          }
        }
      },
      {
        name: {
          givenName: 'John',
          familyName: 'Doe'
        },
        cozyMetadata: {
          sync: {
            [SOURCE_ACCOUNT_ID]: {
              id: 'people/987654'
            }
          }
        }
      }
    ]
    it('should find the google contact in cozy contacts', () => {
      const googleContact = {
        resourceName: 'people/987654',
        names: [
          {
            givenName: 'John',
            familyName: 'Doe'
          }
        ]
      }

      const expected = {
        name: {
          givenName: 'John',
          familyName: 'Doe'
        },
        cozyMetadata: {
          sync: {
            [SOURCE_ACCOUNT_ID]: {
              id: 'people/987654'
            }
          }
        }
      }
      const result = findRemoteDocument(
        googleContact,
        cozyContacts,
        SOURCE_ACCOUNT_ID
      )
      expect(result).toEqual(expected)
    })

    it('should return undefined if contact is not found', () => {
      const googleContact = {
        resourceName: 'people/666',
        names: [
          {
            givenName: 'Jean',
            familyName: 'Dupont'
          }
        ]
      }
      const result = findRemoteDocument(
        googleContact,
        cozyContacts,
        SOURCE_ACCOUNT_ID
      )
      expect(result).toBeUndefined()
    })
  })

  describe('shouldSave', () => {
    it('should return true if contact is not found in cozy contacts', () => {
      const googleContact = { resourceName: 'people/123456' }
      const result = shouldSave(googleContact, undefined)
      expect(result).toBe(true)
    })

    it('should return false if contact already exists in cozy contacts', () => {
      const googleContact = { resourceName: 'people/123456' }
      const cozyContact = {
        name: { givenName: 'John', familyName: 'Doe' },
        cozyMetadata: {
          sync: {
            [SOURCE_ACCOUNT_ID]: {
              id: 'people/123456'
            }
          }
        }
      }
      const result = shouldSave(googleContact, cozyContact)
      expect(result).toBe(false)
    })
  })

  describe('save', () => {
    beforeEach(() => {
      mockDate('2017-01-30T15:00:00.210Z')
    })

    afterEach(() => {
      restoreDate()
    })

    it('should create cozy contact from google contact', async () => {
      const googleContact = {
        resourceName: 'people/123456',
        names: [{ givenName: 'John', familyName: 'Doe' }],
        emailAddresses: [
          {
            metadata: {
              primary: true
            },
            value: 'john.doe@posteo.net',
            type: 'work',
            formattedType: 'Work'
          }
        ],
        etag: 'a3f48ca6-6f6c-440e-b7e2-7ab4aa64e45e'
      }
      await save(googleContact)
      const expected = {
        _type: 'io.cozy.contacts',
        address: [],
        birthday: undefined,
        company: undefined,
        email: [
          {
            address: 'john.doe@posteo.net',
            label: 'Work',
            primary: true,
            type: 'work'
          }
        ],
        metadata: {
          google: {
            metadata: undefined
          },
          version: 1
        },
        name: {
          familyName: 'Doe',
          givenName: 'John'
        },
        note: undefined,
        phone: [],
        vendorId: 'people/123456',
        cozyMetadata: {
          sync: {
            [SOURCE_ACCOUNT_ID]: {
              contactsAccountsId: SOURCE_ACCOUNT_ID,
              id: 'people/123456',
              konnector: 'konnector-google',
              lastSync: '2017-01-30T15:00:00.210Z',
              remoteRev: 'a3f48ca6-6f6c-440e-b7e2-7ab4aa64e45e'
            }
          },
          updatedAt: '2017-01-30T15:00:00.210Z',
          updatedByApps: ['konnector-google']
        }
      }
      expect(cozyUtils.client.save).toHaveBeenCalledWith(expected)
    })
  })

  describe('afterSave', () => {
    it('should resolve with the id of the cozy contact', async () => {
      const cozyContact = {
        id: '20ffa4f2-38e7-46d5-a68d-aa7ab2f01026'
      }
      const result = await afterSave(null, cozyContact)
      expect(result).toEqual('20ffa4f2-38e7-46d5-a68d-aa7ab2f01026')
    })
  })
})
