const googleapis = require('./__mocks__/googleapis')
const google = require('./google')

jest.mock('googleapis')

describe('google API helpers', () => {
  describe('createContact', () => {
    const peopleAPIMock = googleapis.google.people()
    const googleCreateContactSpy = peopleAPIMock.people.createContact

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

      const result = await google.createContact(googlePerson)
      expect(result).toEqual('ok')
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
})
