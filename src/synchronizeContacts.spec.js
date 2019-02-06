const getCozyToGoogleStrategy = require('./getCozyToGoogleStrategy')
const synchronizeContacts = require('./synchronizeContacts')
const googleUtils = require('./google')
const { mockDate, restoreDate } = require('../jestHelpers/mockDate')

jest.mock('./google')

const SOURCE_ACCOUNT_ID = '45c49c15-4b00-48e8-8bfd-29f8177b89ff'
const OTHER_SOURCE_ACCOUNT_ID = 'cb31eb3e-989e-4818-8b45-afed904237da'

const MOCKED_DATE = '2018-05-05T09:09:00.115Z'

const cozyContacts = [
  {
    id: 'jane-doe-attached-to-the-source',
    name: { givenName: 'Jane', familyName: 'Doe' },
    cozyMetadata: {
      sync: {
        [SOURCE_ACCOUNT_ID]: {
          id: 'people/123456'
        }
      }
    }
  },
  {
    id: 'john-doe-attached-to-the-source',
    name: { givenName: 'John', familyName: 'Doe' },
    cozyMetadata: {
      sync: {
        [SOURCE_ACCOUNT_ID]: {
          id: 'people/987654'
        }
      }
    }
  },
  {
    // a contact that is not attached to a source
    id: 'reinhold-jenkins-no-source',
    name: { givenName: 'Reinhold', familyName: 'Jenkins' },
    cozyMetadata: {
      updatedByApps: ['Contacts']
    }
  },
  {
    id: 'larue-cremin-attached-to-another-source',
    name: { givenName: 'Larue', familyName: 'Cremin' },
    cozyMetadata: {
      sync: {
        [OTHER_SOURCE_ACCOUNT_ID]: {
          id: 'people/987654'
        }
      }
    }
  }
]

beforeAll(() => {
  mockDate(MOCKED_DATE)
})

afterAll(() => {
  restoreDate()
})

describe('synchronizeContacts', () => {
  const fakeCozyClient = {}

  beforeEach(() => {
    googleUtils.createContact.mockResolvedValueOnce({
      data: {
        etag: 'etag-963fd240-d568-4b24-9f26-6e658d4e4958',
        resourceName: 'people/96508'
      }
    })
    googleUtils.createContact.mockResolvedValueOnce({
      data: {
        etag: 'etag-6deab8dd-5a0f-451d-bcfe-fd81dd57bdcd',
        resourceName: 'people/78485'
      }
    })
    fakeCozyClient.save = jest.fn(contact =>
      Promise.resolve({
        data: { id: contact.id }
      })
    )
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('synchronize contacts with cozy to google strategy', () => {
    it('should synchronize cozy contacts to google', async () => {
      const googleContacts = [] // we don't care about google contacts here
      const strategy = getCozyToGoogleStrategy(
        fakeCozyClient,
        googleUtils,
        SOURCE_ACCOUNT_ID
      )
      const result = await synchronizeContacts(
        cozyContacts,
        googleContacts,
        strategy
      )
      expect(result).toEqual([
        null,
        null,
        { created: true, id: 'reinhold-jenkins-no-source' },
        { created: true, id: 'larue-cremin-attached-to-another-source' }
      ])

      expect(fakeCozyClient.save).toHaveBeenCalledTimes(2)
      expect(fakeCozyClient.save.mock.calls[0]).toMatchSnapshot()
      expect(fakeCozyClient.save.mock.calls[1]).toMatchSnapshot()
    })

    it('should do nothing if there are no contacts to sync', async () => {
      const cozyContacts = []
      const googleContacts = []
      const strategy = getCozyToGoogleStrategy(
        fakeCozyClient,
        googleUtils,
        SOURCE_ACCOUNT_ID
      )
      const result = await synchronizeContacts(
        cozyContacts,
        googleContacts,
        strategy
      )
      expect(result).toEqual([])
    })

    it('should fail nicely on google error', async () => {
      const googleContacts = []
      googleUtils.createContact.mockRejectedValue(
        'Unable to create google contact'
      )
      const strategy = getCozyToGoogleStrategy(
        fakeCozyClient,
        googleUtils,
        SOURCE_ACCOUNT_ID
      )
      try {
        await synchronizeContacts(cozyContacts, googleContacts, strategy)
      } catch (err) {
        expect(err).toMatch('Unable to create google contact')
      }
    })

    it('should fail nicely on cozy client error', async () => {
      const googleContacts = []
      fakeCozyClient.save.mockRejectedValue('Unable to save contact in cozy')
      const strategy = getCozyToGoogleStrategy(
        fakeCozyClient,
        googleUtils,
        SOURCE_ACCOUNT_ID
      )
      try {
        await synchronizeContacts(cozyContacts, googleContacts, strategy)
      } catch (err) {
        expect(err).toMatch('Unable to save contact in cozy')
      }
    })
  })
})
