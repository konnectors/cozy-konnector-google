const googleapis = require('./__mocks__/googleapis')
const GoogleUtils = require('./GoogleUtils')

jest.mock('googleapis')

describe('GoogleUtils', () => {
  const googleUtils = new GoogleUtils()
  const peopleAPIMock = googleapis.google.people()
  const listSpy = peopleAPIMock.people.connections.list
  const googleCreateContactSpy = peopleAPIMock.people.createContact
  const googleUpdateContactSpy = peopleAPIMock.people.updateContact
  const googleGetContactSpy = peopleAPIMock.people.get

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('getAllContacts', () => {
    const personFields =
      'addresses,ageRanges,biographies,birthdays,braggingRights,coverPhotos,emailAddresses,events,genders,imClients,interests,locales,memberships,metadata,names,nicknames,occupations,organizations,phoneNumbers,photos,relations,relationshipInterests,relationshipStatuses,residences,skills,taglines,urls'
    it('should retrieve all contacts using syncToken', async () => {
      listSpy.mockResolvedValueOnce({
        data: {
          connections: [
            {
              resourceName: 'people/142434',
              names: [
                {
                  givenName: 'John',
                  familyName: 'Doe'
                }
              ]
            },
            {
              resourceName: 'people/333222',
              names: [
                {
                  givenName: 'Jane',
                  familyName: 'Doe'
                }
              ]
            }
          ],
          nextSyncToken: 'my-sync-token'
        }
      })
      const result = await googleUtils.getAllContacts({
        syncToken: 'my-sync-token'
      })
      expect(listSpy).toHaveBeenCalledWith({
        pageToken: null,
        personFields,

        requestSyncToken: true,
        resourceName: 'people/me',
        syncToken: 'my-sync-token'
      })
      expect(result).toEqual({
        contacts: [
          {
            resourceName: 'people/142434',
            names: [
              {
                givenName: 'John',
                familyName: 'Doe'
              }
            ]
          },
          {
            resourceName: 'people/333222',
            names: [
              {
                givenName: 'Jane',
                familyName: 'Doe'
              }
            ]
          }
        ],
        nextSyncToken: 'my-sync-token'
      })
    })

    it('should retrieve contacts with pagination', async () => {
      listSpy.mockResolvedValueOnce({
        data: {
          connections: [
            {
              resourceName: 'people/142434',
              names: [
                {
                  givenName: 'John',
                  familyName: 'Doe'
                }
              ]
            },
            {
              resourceName: 'people/333222',
              names: [
                {
                  givenName: 'Jane',
                  familyName: 'Doe'
                }
              ]
            }
          ],
          nextPageToken: 'page-token-1'
        }
      })
      listSpy.mockResolvedValueOnce({
        data: {
          connections: [
            {
              resourceName: 'people/142434',
              names: [
                {
                  givenName: 'Amira',
                  familyName: 'Hane'
                }
              ]
            },
            {
              resourceName: 'people/4502',
              names: [
                {
                  givenName: 'Justus',
                  familyName: 'Rutherford'
                }
              ]
            }
          ],
          nextPageToken: 'page-token-2'
        }
      })
      listSpy.mockResolvedValueOnce({
        data: {
          connections: [
            {
              resourceName: 'people/27368',
              names: [
                {
                  givenName: 'Nelle',
                  familyName: 'Emard'
                }
              ]
            }
          ],
          nextSyncToken: 'new-sync-token'
        }
      })
      const result = await googleUtils.getAllContacts({
        syncToken: 'my-sync-token'
      })
      expect(listSpy).toHaveBeenCalledWith({
        pageToken: null,
        personFields,
        requestSyncToken: true,
        resourceName: 'people/me',
        syncToken: 'my-sync-token'
      })
      expect(result).toEqual({
        contacts: [
          {
            resourceName: 'people/142434',
            names: [
              {
                givenName: 'John',
                familyName: 'Doe'
              }
            ]
          },
          {
            resourceName: 'people/333222',
            names: [
              {
                givenName: 'Jane',
                familyName: 'Doe'
              }
            ]
          },
          {
            resourceName: 'people/142434',
            names: [
              {
                givenName: 'Amira',
                familyName: 'Hane'
              }
            ]
          },
          {
            resourceName: 'people/4502',
            names: [
              {
                givenName: 'Justus',
                familyName: 'Rutherford'
              }
            ]
          },
          {
            resourceName: 'people/27368',
            names: [
              {
                givenName: 'Nelle',
                familyName: 'Emard'
              }
            ]
          }
        ],
        nextSyncToken: 'new-sync-token'
      })
    })

    it('should call Google API without syncToken if ours is expired', async () => {
      listSpy.mockRejectedValueOnce({
        code: 400,
        message:
          'Sync token is expired. Clear local cache and retry call without the sync token'
      })
      listSpy.mockResolvedValueOnce({
        data: {
          connections: [
            {
              resourceName: 'people/936912',
              names: [
                {
                  givenName: 'Dina',
                  familyName: 'Dickinson'
                }
              ]
            }
          ],
          nextSyncToken: 'new-sync-token'
        }
      })
      const result = await googleUtils.getAllContacts({
        syncToken: 'expired-token'
      })
      expect(result).toEqual({
        contacts: [
          {
            resourceName: 'people/936912',
            names: [
              {
                givenName: 'Dina',
                familyName: 'Dickinson'
              }
            ]
          }
        ],
        nextSyncToken: 'new-sync-token'
      })
      expect(listSpy).toHaveBeenLastCalledWith({
        pageToken: null,
        personFields,
        requestSyncToken: true,
        resourceName: 'people/me',
        syncToken: null
      })
    })
  })

  describe('createContact', () => {
    it('should create a google contact from a cozy contact', async () => {
      const googlePerson = {
        emailAddresses: [
          {
            metadata: {
              primary: true
            },
            type: 'work',
            value: 'johndoe@nuage.fr'
          },
          {
            metadata: {
              primary: false
            },
            type: undefined,
            value: 'john.doe@gmail.com'
          }
        ],
        names: [{ familyName: 'Doe', givenName: 'John' }]
      }

      const result = await googleUtils.createContact(googlePerson)
      expect(result).toEqual('The contact was created')
      expect(googleapis.google.people).toHaveBeenCalledWith({
        auth: new googleapis.spies.FakeOAuth2(),
        version: 'v1'
      })
      expect(googleCreateContactSpy).toHaveBeenCalledWith({
        parent: 'people/me',
        requestBody: googlePerson
      })
    })
  })

  describe('updateContact', () => {
    it('should update a google contact', async () => {
      const googlePerson = {
        emailAddresses: [
          {
            metadata: { primary: true },
            formattedType: 'Work',
            type: 'work',
            value: 'johndoe@nuage.fr'
          },
          {
            metadata: { primary: false },
            formattedType: undefined,
            type: undefined,
            value: 'john.doe@gmail.com'
          }
        ],
        names: [{ familyName: 'Doe', givenName: 'John' }]
      }

      const expectedRequestBody = {
        emailAddresses: [
          {
            metadata: { primary: true },
            formattedType: 'Work',
            type: 'work',
            value: 'johndoe@nuage.fr'
          },
          {
            metadata: { primary: false },
            formattedType: undefined,
            type: undefined,
            value: 'john.doe@gmail.com'
          }
        ],
        etag: '44add609-2261-49c8-bf92-a1776a5d8b09',
        names: [{ familyName: 'Doe', givenName: 'John' }]
      }
      const result = await googleUtils.updateContact(
        googlePerson,
        'people/622740',
        '44add609-2261-49c8-bf92-a1776a5d8b09'
      )
      expect(result).toEqual('The contact was updated')
      expect(googleapis.google.people).toHaveBeenCalledWith({
        auth: new googleapis.spies.FakeOAuth2(),
        version: 'v1'
      })
      expect(googleUpdateContactSpy).toHaveBeenCalledWith({
        resourceName: 'people/622740',
        requestBody: expectedRequestBody,
        updatePersonFields: 'emailAddresses,names'
      })
    })
  })

  describe('getContact', () => {
    it('should retrieve a contact on Google', async () => {
      const result = await googleUtils.getContact('people/69042')
      expect(result).toEqual({
        resourceName: 'people/123456',
        etag: '6f5f3948-375c-4b7f-8d6b-241ccb0fba8f'
      })
      expect(googleGetContactSpy).toHaveBeenCalledWith({
        resourceName: 'people/69042',
        personFields: ['names']
      })
    })
  })
})
