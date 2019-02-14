const synchronizeContacts = require('./synchronizeContacts')
const cozyUtils = require('./cozy')
const googleUtils = require('./google')
const { mockDate, restoreDate } = require('../jestHelpers/mockDate')

jest.mock('./google')

const SOURCE_ACCOUNT_ID = '45c49c15-4b00-48e8-8bfd-29f8177b89ff'
const OTHER_SOURCE_ACCOUNT_ID = 'cb31eb3e-989e-4818-8b45-afed904237da'

const MOCKED_DATE = '2018-05-05T09:09:00.115Z'

const cozyContacts = [
  // If the contact is unchanged, we don't pass it to synchronizeContacts
  // {
  //   id: 'jane-doe-unchanged',
  //   name: { givenName: 'Jane', familyName: 'Doe' },
  //   cozyMetadata: {
  //     doctypeVersion: 2,
  //     createdAt: '2018-02-22T11:11:11.222Z',
  //     createdByApp: 'konnector-google',
  //     createdByAppVersion: '2.0.0',
  //     updatedAt: '2018-03-22T12:09:00.222Z',
  //     updatedByApps: ['konnector-google'],
  //     importedAt: '2018-02-22T11:11:11.222Z',
  //     importedFrom: 'konnector-google',
  //     sourceAccount: SOURCE_ACCOUNT_ID,
  //     sync: {
  //       [SOURCE_ACCOUNT_ID]: {
  //         id: 'people/123456',
  //         remoteRev: '5b84b076-a2bd-4a98-af08-46d6db21660e'
  //       }
  //     }
  //   }
  // },
  {
    // a contact that is not attached to a source
    id: 'reinhold-jenkins-no-source',
    name: { givenName: 'Reinhold', familyName: 'Jenkins' },
    cozyMetadata: {
      doctypeVersion: 2,
      createdAt: '2016-05-11T09:09:00.222Z',
      createdByApp: 'Contacts',
      createdByAppVersion: '3.3.0',
      updatedAt: '2018-11-11T09:09:00.222Z',
      updatedByApps: ['Contacts'],
      importedAt: undefined,
      importedFrom: undefined,
      sourceAccount: undefined
    }
  },
  {
    id: 'larue-cremin-attached-to-another-source',
    name: { givenName: 'Larue', familyName: 'Cremin' },
    cozyMetadata: {
      doctypeVersion: 2,
      createdAt: '2014-02-22T09:55:00.222Z',
      createdByApp: 'konnector-google',
      createdByAppVersion: '2.0.0',
      updatedAt: '2018-03-22T12:09:00.222Z',
      updatedByApps: ['Contacts'],
      importedAt: '2014-02-22T09:55:00.222Z',
      importedFrom: 'konnector-google',
      sourceAccount: OTHER_SOURCE_ACCOUNT_ID,
      sync: {
        [OTHER_SOURCE_ACCOUNT_ID]: {
          id: 'people/987654',
          remoteRev: '55c10151-8085-4bcf-b7b6-6314bcc9665f'
        }
      }
    }
  },
  {
    id: 'john-doe-edited',
    _type: 'io.cozy.contacts',
    _rev: '9a045a8e-8db7-49eb-a0b3-8388566f8a9c',
    name: { givenName: 'John', familyName: 'Doe' },
    email: [
      {
        address: 'john.doe@posteo.net',
        type: 'personal',
        primary: false
      },
      {
        address: 'john.doe@cozycloud.cc',
        primary: true
      }
    ],
    birthday: '1955-2-22',
    company: 'Cozy cloud',
    cozyMetadata: {
      doctypeVersion: 2,
      createdAt: '2016-06-30T09:33:00.123Z',
      createdByApp: 'Contacts',
      createdByAppVersion: '2.0.0',
      updatedAt: '2019-01-22T18:18:00.222Z',
      updatedByApps: ['Contacts'],
      importedAt: '2016-06-30T09:33:00.123Z',
      importedFrom: 'konnector-google',
      sourceAccount: SOURCE_ACCOUNT_ID,
      sync: {
        [SOURCE_ACCOUNT_ID]: {
          id: 'people/987654',
          remoteRev: '9659474d-f3ce-47a5-a9f1-01b55e6b0987'
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

describe('synchronizeContacts function', () => {
  const fakeCozyClient = {}

  beforeEach(() => {
    googleUtils.createContact.mockName('googleCreateContact')
    googleUtils.createContact.mockResolvedValueOnce({
      data: {
        etag: '963fd240-d568-4b24-9f26-6e658d4e4958',
        resourceName: 'people/96508'
      }
    })
    googleUtils.createContact.mockResolvedValueOnce({
      data: {
        etag: '6deab8dd-5a0f-451d-bcfe-fd81dd57bdcd',
        resourceName: 'people/78485'
      }
    })
    googleUtils.updateContact.mockResolvedValueOnce({
      data: {
        etag: '6020dd2f-c9b8-4865-bdbd-078faad65204',
        resourceName: 'people/987654' // john-doe-edited
      }
    })
    fakeCozyClient.save = jest
      .fn(contact =>
        Promise.resolve({
          data: { id: contact.id }
        })
      )
      .mockName('cozySave')

    cozyUtils.client = fakeCozyClient
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it.only('should synchronize contacts', async () => {
    const googleContacts = [
      {
        // contact to create
        etag: '958e26de-80d2-4051-8ba9-ae954dffd9f6',
        resourceName: 'people/751021',
        names: [{ givenName: 'Kayleigh', familyName: 'Yundt' }],
        metadata: { deleted: false }
      },
      {
        // contact that already exists in cozy contacts
        resourceName: 'people/944070',
        etag: '6092c3ca-c9f8-4abb-a27b-3add4158bfc2',
        names: [{ givenName: 'Adan', familyName: 'Mueller' }],
        metadata: { deleted: false }
      },
      // {
      //   // contact that already exists in cozy contacts
      //   resourceName: 'people/123456',
      //   etag: '5b84b076-a2bd-4a98-af08-46d6db21660e',
      //   names: [{ givenName: 'Jane', familyName: 'Doe' }],
      //   metadata: { deleted: false }
      // },
      {
        // contact that already exists in cozy contacts
        resourceName: 'people/987654',
        etag: '9659474d-f3ce-47a5-a9f1-01b55e6b0987',
        names: [{ givenName: 'John', familyName: 'Doe' }],
        emails: [
          {
            address: 'john.doe@posteo.net',
            type: 'personal',
            primary: true
          }
        ],
        metadata: { deleted: false }
      },
      {
        // contact that has been deleted on Google
        resourceName: 'people/672617',
        etag: 'ea79ad60-8c9f-4143-830f-07dfb260630b',
        names: [{ givenName: 'Aurelia', familyName: 'Hayes' }],
        metadata: { deleted: true }
      }
    ]

    const result = await synchronizeContacts(
      SOURCE_ACCOUNT_ID,
      cozyContacts,
      googleContacts,
      cozyUtils,
      googleUtils
    )
    expect(result).toEqual({
      cozy: {
        created: 2,
        deleted: 0,
        updated: 0
      },
      google: {
        created: 2,
        deleted: 0,
        updated: 1
      }
    })

    expect(fakeCozyClient.save).toHaveBeenCalledTimes(5)
    expect(fakeCozyClient.save.mock.calls[0]).toMatchSnapshot(
      'reinholdJenkinsInCozy'
    )
    expect(fakeCozyClient.save.mock.calls[1]).toMatchSnapshot(
      'larueCreminInCozy'
    )
    expect(fakeCozyClient.save.mock.calls[2]).toMatchSnapshot('johnDoeInCozy')
    expect(fakeCozyClient.save.mock.calls[3]).toMatchSnapshot(
      'kayleighYundtInCozy'
    )
    expect(fakeCozyClient.save.mock.calls[4]).toMatchSnapshot(
      'adanMuellerInCozy'
    )

    expect(googleUtils.createContact).toHaveBeenCalledTimes(2)
    expect(googleUtils.createContact.mock.calls[0]).toMatchSnapshot(
      'reinholdJenkinsInGoogle'
    )
    expect(googleUtils.createContact.mock.calls[1]).toMatchSnapshot(
      'larueCreminInGoogle'
    )

    expect(googleUtils.updateContact).toHaveBeenCalledTimes(1)
    expect(googleUtils.updateContact.mock.calls[0]).toMatchSnapshot(
      'johnDoeInGoogle'
    )
  })

  it('should do nothing if there are no contacts to sync', async () => {
    const cozyContacts = []
    const googleContacts = []
    const result = await synchronizeContacts(
      SOURCE_ACCOUNT_ID,
      cozyContacts,
      googleContacts,
      cozyUtils,
      googleUtils
    )
    expect(result).toEqual({
      cozy: {
        created: 0,
        deleted: 0,
        updated: 0
      },
      google: {
        created: 0,
        deleted: 0,
        updated: 0
      }
    })
  })

  it('should fail nicely on google error', async () => {
    const googleContacts = []
    googleUtils.createContact.mockRejectedValue(
      'Unable to create google contact'
    )

    try {
      await synchronizeContacts(
        SOURCE_ACCOUNT_ID,
        cozyContacts,
        googleContacts,
        cozyUtils,
        googleUtils
      )
    } catch (err) {
      expect(err.message).toMatch(
        'Unable to synchronize contacts: Unable to create google contact'
      )
    }
  })

  it('should fail nicely on cozy client error', async () => {
    const googleContacts = []
    fakeCozyClient.save.mockRejectedValue(
      new Error('Unable to save contact in cozy')
    )
    try {
      await synchronizeContacts(
        SOURCE_ACCOUNT_ID,
        cozyContacts,
        googleContacts,
        cozyUtils,
        googleUtils
      )
    } catch (err) {
      expect(err.message).toMatch(
        'Unable to synchronize contacts: Unable to save contact in cozy'
      )
    }
  })
})
