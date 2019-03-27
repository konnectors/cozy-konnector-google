const { log } = require('cozy-konnector-libs')
const CozyClient = require('cozy-client').default
const CozyUtils = require('./CozyUtils')

const {
  APP_NAME,
  APP_VERSION,
  DOCTYPE_CONTACTS,
  DOCTYPE_CONTACTS_ACCOUNT
} = require('./constants')

jest.mock('cozy-client')
jest.mock('cozy-konnector-libs')

describe('CozyUtils', () => {
  const cozyUtils = new CozyUtils('fakeAccountId')

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should initialize a cozy client', () => {
    expect(CozyClient).toHaveBeenCalledWith({
      appMetadata: {
        slug: APP_NAME,
        sourceAccount: 'fakeAccountId',
        version: APP_VERSION
      },
      schema: {
        accounts: {
          doctype: 'io.cozy.accounts',
          doctypeVersion: 1
        },
        contacts: {
          doctype: 'io.cozy.contacts',
          doctypeVersion: 2
        },
        contactsAccounts: {
          doctype: 'io.cozy.contacts.accounts',
          doctypeVersion: 1
        }
      },
      token: '{"token":{"accessToken":"0230b4b0-f833-4e4a-b70a-ffb1e48e2c01"}}',
      uri: 'https://rosellalabadie.mycozy.cloud'
    })

    expect(cozyUtils.client).toBeDefined()
  })

  describe('prepareIndex method', () => {
    it('should prepare an index on google id for contacts', () => {
      const createIndexSpy = jest.fn()
      cozyUtils.client.collection = jest.fn(() => ({
        createIndex: createIndexSpy
      }))
      cozyUtils.prepareIndex('fakeAccountId')
      expect(cozyUtils.client.collection).toHaveBeenCalledWith(DOCTYPE_CONTACTS)
      expect(createIndexSpy).toHaveBeenCalledWith([
        'cozyMetadata.sync.fakeAccountId.id'
      ])
    })
  })

  describe('getUpdatedContacts', () => {
    it('should get all updated contacts', async () => {
      const findSpy = jest.fn()
      // first page
      findSpy.mockResolvedValueOnce({
        data: [
          {
            id: 'john-doe'
          },
          {
            id: 'jane-doe'
          }
        ],
        next: true
      })
      // second page
      findSpy.mockResolvedValueOnce({
        data: [
          {
            id: 'pierre-durand'
          },
          {
            id: 'isabelle-durand'
          }
        ],
        next: false
      })
      cozyUtils.client.collection = jest.fn(() => ({
        find: findSpy
      }))
      const contactAccount = {
        id: 'fakeAccountId',
        lastSync: '2018-04-03T15:16:02.276Z',
        shouldSyncOrphan: false
      }
      const result = await cozyUtils.getUpdatedContacts(contactAccount)
      expect(result).toEqual([
        {
          id: 'john-doe'
        },
        {
          id: 'jane-doe'
        },
        {
          id: 'pierre-durand'
        },
        {
          id: 'isabelle-durand'
        }
      ])
      expect(findSpy).toHaveBeenCalledWith(
        {
          cozyMetadata: {
            updatedAt: {
              $gt: '2018-04-03T15:16:02.276Z'
            }
          },
          relationships: {
            accounts: {
              data: {
                $elemMatch: {
                  _id: 'fakeAccountId'
                }
              }
            }
          }
        },
        {
          indexedFields: ['cozyMetadata.updatedAt'],
          limit: 100,
          skip: 0
        }
      )
    })

    it('should get all updated contacts including orphans', async () => {
      const findSpy = jest.fn()
      findSpy.mockResolvedValueOnce({
        data: [
          {
            id: 'john-doe'
          },
          {
            id: 'jane-doe'
          }
        ],
        next: false
      })
      cozyUtils.client.collection = jest.fn(() => ({
        find: findSpy
      }))
      const contactAccount = {
        id: 'fakeAccountId',
        lastSync: '2018-04-03T15:16:02.276Z',
        shouldSyncOrphan: true
      }
      const result = await cozyUtils.getUpdatedContacts(contactAccount)
      expect(result).toEqual([
        {
          id: 'john-doe'
        },
        {
          id: 'jane-doe'
        }
      ])
      expect(findSpy).toHaveBeenCalledWith(
        {
          cozyMetadata: {
            updatedAt: {
              $gt: '2018-04-03T15:16:02.276Z'
            }
          },
          relationships: {
            accounts: {
              data: {
                $elemMatch: {
                  _id: 'fakeAccountId'
                }
              }
            }
          }
        },
        {
          indexedFields: ['cozyMetadata.updatedAt'],
          limit: 100,
          skip: 0
        }
      )
    })
  })

  describe('findContact', () => {
    it('should find the contact that has given resource name', async () => {
      const findSpy = jest.fn().mockResolvedValue({
        data: [
          {
            id: 'my-awesome-contact'
          }
        ]
      })
      cozyUtils.client.collection = jest.fn(() => ({
        find: findSpy
      }))
      const result = await cozyUtils.findContact(
        'fakeAccountId',
        'people/99765'
      )
      expect(findSpy).toHaveBeenCalledWith(
        {
          cozyMetadata: {
            sync: {
              fakeAccountId: {
                id: 'people/99765'
              }
            }
          }
        },
        { indexedFields: ['cozyMetadata.sync.fakeAccountId.id'] }
      )
      expect(result).toEqual({ id: 'my-awesome-contact' })
    })
  })

  describe('findOrCreateContactAccount', () => {
    it('should return the contact account if it exists', async () => {
      const fakeAccount = {
        canLinkContacts: true,
        shouldSyncOrphan: true,
        lastSync: null,
        lastLocalSync: null,
        name: 'john.doe@gmail.com',
        _type: DOCTYPE_CONTACTS_ACCOUNT,
        type: APP_NAME,
        sourceAccount: 'fakeAccountId',
        version: 1
      }
      const findSpy = jest.fn().mockResolvedValue({
        data: [fakeAccount]
      })
      cozyUtils.client.collection = jest.fn(() => ({
        find: findSpy
      }))

      const result = await cozyUtils.findOrCreateContactAccount(
        'fakeAccountId',
        'john.doe@gmail.com'
      )
      expect(result).toEqual(fakeAccount)
    })

    it('should update an existing account with the same email', async () => {
      const previousAccount = {
        _id: '123',
        _rev: 'abc',
        canLinkContacts: true,
        shouldSyncOrphan: true,
        lastSync: null,
        lastLocalSync: null,
        name: 'john.doe@gmail.com',
        _type: DOCTYPE_CONTACTS_ACCOUNT,
        type: APP_NAME,
        sourceAccount: 'previousAccountId',
        version: 1
      }
      // the first call looks for accounts with the same sourceAccount, but there are none
      const findSpy = jest.fn().mockResolvedValueOnce({
        data: []
      })
      // the second call looks for sources with the same email, regardless of the sourceAccount
      findSpy.mockResolvedValueOnce({
        data: [previousAccount]
      })
      cozyUtils.client.collection = jest.fn(() => ({
        find: findSpy
      }))
      cozyUtils.client.save = jest.fn().mockResolvedValue({
        data: {
          id: '123'
        }
      })

      const result = await cozyUtils.findOrCreateContactAccount(
        'fakeAccountId',
        'john.doe@gmail.com'
      )
      expect(cozyUtils.client.save).toHaveBeenCalledWith({
        _id: '123',
        _rev: 'abc',
        canLinkContacts: true,
        shouldSyncOrphan: true,
        lastSync: null,
        lastLocalSync: null,
        name: 'john.doe@gmail.com',
        _type: DOCTYPE_CONTACTS_ACCOUNT,
        type: APP_NAME,
        sourceAccount: 'fakeAccountId',
        version: 1
      })
      expect(result).toEqual({
        id: '123'
      })
    })

    it('should create a contact account if none is found', async () => {
      const findSpy = jest.fn().mockResolvedValue({
        data: []
      })
      cozyUtils.client.collection = jest.fn(() => ({
        find: findSpy
      }))
      cozyUtils.client.save = jest.fn().mockResolvedValue({
        data: {
          id: 'saved-contact-account'
        }
      })

      const result = await cozyUtils.findOrCreateContactAccount(
        'fakeAccountId',
        'john.doe@gmail.com'
      )
      expect(cozyUtils.client.save).toHaveBeenCalledWith({
        canLinkContacts: true,
        shouldSyncOrphan: true,
        lastSync: null,
        lastLocalSync: null,
        name: 'john.doe@gmail.com',
        _type: DOCTYPE_CONTACTS_ACCOUNT,
        type: APP_NAME,
        sourceAccount: 'fakeAccountId',
        version: 1
      })
      expect(result).toEqual({
        id: 'saved-contact-account'
      })
    })
  })

  describe('updateAccountName', () => {
    it('should search an account and update its name', async () => {
      const ACCOUNT_ID = '9b56d5ac-28d7-40fa-aba5-f9e79b0f3629'
      const getSpy = jest.fn().mockResolvedValue({
        data: {
          _id: ACCOUNT_ID,
          _rev: 'a2cca53d-819b-45c6-8f38-403c7972ab03',
          name: '',
          auth: {
            access_token: 'whatever',
            accountName: ''
          }
        }
      })
      cozyUtils.client.collection = jest.fn(() => ({
        get: getSpy
      }))
      cozyUtils.client.save = jest.fn()
      await cozyUtils.updateAccountName(ACCOUNT_ID, 'john.doe@gmail.com')
      expect(getSpy).toHaveBeenCalledWith(ACCOUNT_ID)
      expect(cozyUtils.client.save).toHaveBeenCalledWith({
        _id: ACCOUNT_ID,
        _rev: 'a2cca53d-819b-45c6-8f38-403c7972ab03',
        name: '',
        auth: {
          access_token: 'whatever',
          accountName: 'john.doe@gmail.com'
        }
      })
    })

    it('should only display a log if something goes wrong', async () => {
      const ACCOUNT_ID = '44a2bcf2-5f9c-4f3e-a238-feb4efb1731d'
      const getSpy = jest.fn()
      getSpy.mockRejectedValue(new Error('Cannot retrieve account'))
      cozyUtils.client.collection = jest.fn(() => ({
        get: getSpy
      }))
      cozyUtils.client.save = jest.fn()
      await cozyUtils.updateAccountName(ACCOUNT_ID, 'john.doe@gmail.com')
      expect(getSpy).toHaveBeenCalledWith(ACCOUNT_ID)
      expect(cozyUtils.client.save).not.toHaveBeenCalled()
      expect(log).toHaveBeenCalledWith(
        'warn',
        'Error while trying to update accountName (for 44a2bcf2-5f9c-4f3e-a238-feb4efb1731d): Cannot retrieve account'
      )
    })
  })
})
