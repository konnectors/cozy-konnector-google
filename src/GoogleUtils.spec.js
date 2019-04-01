const googleapis = require('./__mocks__/googleapis')
const GoogleUtils = require('./GoogleUtils')

jest.mock('googleapis')

describe('GoogleUtils', () => {
  const googleUtils = new GoogleUtils()
  const peopleAPIMock = googleapis.google.people()
  const googleCreateContactSpy = peopleAPIMock.people.createContact
  const googleUpdateContactSpy = peopleAPIMock.people.updateContact
  const googleGetSpy = peopleAPIMock.people.get

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

    it('should ask for a new etag and retry if etag is too old', async () => {
      const googlePerson = {
        names: [{ familyName: 'Doe', givenName: 'Jane' }]
      }
      googleUpdateContactSpy.mockRejectedValueOnce({
        code: 400,
        message:
          'Request person.etag is different than the current person.etag. Clear local cache and get the latest person.'
      })
      googleGetSpy.mockResolvedValue({
        data: {
          etag: '66a4721f-523f-436b-8482-8f161259170d'
        }
      })
      await googleUtils.updateContact(
        googlePerson,
        'people/648558',
        'an-invalid-etag'
      )
      expect(googleUpdateContactSpy).toHaveBeenNthCalledWith(1, {
        resourceName: 'people/648558',
        requestBody: {
          etag: 'an-invalid-etag',
          names: [{ familyName: 'Doe', givenName: 'Jane' }]
        },
        updatePersonFields: 'names'
      })

      expect(googleUpdateContactSpy).toHaveBeenNthCalledWith(2, {
        resourceName: 'people/648558',
        requestBody: {
          etag: '66a4721f-523f-436b-8482-8f161259170d',
          names: [{ familyName: 'Doe', givenName: 'Jane' }]
        },
        updatePersonFields: 'names'
      })
    })
  })
})
