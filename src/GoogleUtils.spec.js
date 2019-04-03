const googleapis = require('./__mocks__/googleapis')
const GoogleUtils = require('./GoogleUtils')

jest.mock('googleapis')

describe('GoogleUtils', () => {
  const googleUtils = new GoogleUtils()
  const peopleAPIMock = googleapis.google.people()
  const googleCreateContactSpy = peopleAPIMock.people.createContact
  const googleUpdateContactSpy = peopleAPIMock.people.updateContact
  const googleGetContactSpy = peopleAPIMock.people.get

  afterEach(() => {
    jest.clearAllMocks()
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
