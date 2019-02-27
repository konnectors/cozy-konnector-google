const synchronizeContacts = require('./synchronizeContacts')
const cozyUtils = require('./cozy')
const googleUtils = require('./google')
const { mockDate, restoreDate } = require('../jestHelpers/mockDate')

jest.mock('./google')

const SOURCE_ACCOUNT_ID = '45c49c15-4b00-48e8-8bfd-29f8177b89ff'
const OTHER_SOURCE_ACCOUNT_ID = 'cb31eb3e-989e-4818-8b45-afed904237da'

const MOCKED_DATE = '2018-05-05T09:09:00.115Z'

const cozyContacts = [
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
      sourceAccount: SOURCE_ACCOUNT_ID,
      sync: {
        [SOURCE_ACCOUNT_ID]: {
          id: 'people/229876',
          remoteRev: '9659474d-f3ce-47a5-a9f1-01b55e6b0987'
        }
      }
    }
  },
  // contact that has been edited on both sides (conflict)
  {
    id: 'clemens-romaguera-edit-conflicts',
    _type: 'io.cozy.contacts',
    _rev: '9a045a8e-8db7-49eb-a0b3-8388566f8a9c',
    name: { givenName: 'Clemens', familyName: 'Romaguera' },
    email: [
      {
        address: 'clemens@google.com',
        type: 'personal',
        primary: false
      }
    ],
    company: 'Google',
    cozyMetadata: {
      doctypeVersion: 2,
      createdAt: '2017-11-20T19:33:00.123Z',
      createdByApp: 'Contacts',
      createdByAppVersion: '2.0.0',
      updatedAt: '2019-02-12T12:18:00.222Z',
      updatedByApps: ['Contacts'],
      sourceAccount: SOURCE_ACCOUNT_ID,
      sync: {
        [SOURCE_ACCOUNT_ID]: {
          id: 'people/56863',
          remoteRev: '5c3435d9-86cb-413f-b38a-fd941fa3ec8d'
        }
      }
    }
  },
  {
    id: 'fabiola-grozdana-deleted-on-cozy',
    _type: 'io.cozy.contacts',
    _rev: '678aad8-fa2b-482c-b9b9-8768bcfe3',
    trashed: true,
    name: { givenName: 'Fabiola', familyName: 'Grozdana' },
    cozyMetadata: {
      doctypeVersion: 2,
      createdAt: '2017-03-22T07:33:00.123Z',
      createdByApp: 'Contacts',
      createdByAppVersion: '2.0.0',
      updatedAt: '2018-11-12T18:18:00.222Z',
      updatedByApps: ['Contacts', 'konnector-google'],
      sourceAccount: SOURCE_ACCOUNT_ID,
      sync: {
        [SOURCE_ACCOUNT_ID]: {
          id: 'people/924609',
          remoteRev: 'ea79ad60-8c9f-4143-830f-07dfb260630b'
        }
      }
    }
  },
  {
    id: 'johanna-moen-deleted-on-google-conflict',
    _type: 'io.cozy.contacts',
    _rev: 'fda8d01b-ff6d-4ce9-b6ea-749a4e3da3e1',
    trashed: false,
    name: { givenName: 'Johanna', familyName: 'Moen' },
    cozyMetadata: {
      doctypeVersion: 2,
      createdAt: '2018-04-22T17:33:00.123Z',
      createdByApp: 'Contacts',
      createdByAppVersion: '2.0.0',
      updatedAt: '2018-12-22T15:18:00.222Z',
      updatedByApps: ['Contacts', 'konnector-google'],
      sourceAccount: SOURCE_ACCOUNT_ID,
      sync: {
        [SOURCE_ACCOUNT_ID]: {
          id: 'people/106666',
          remoteRev: 'bce9d37f-e0f9-44e6-8aa6-51fa8f8781cc'
        }
      }
    }
  }
]

// this data comes from cozy.findContact
const scarlettGutkowski = {
  id: 'scarlett-gutkowski-edited-on-google',
  _type: 'io.cozy.contacts',
  _rev: '36bd0782-bda3-4a3b-900a-0d571cc361b6',
  name: { givenName: 'Scarlett', familyName: 'Gutkowski' },
  cozyMetadata: {
    doctypeVersion: 2,
    createdAt: '2017-03-22T07:33:00.123Z',
    createdByApp: 'Contacts',
    createdByAppVersion: '2.0.0',
    updatedAt: '2018-11-12T18:18:00.222Z',
    updatedByApps: ['Contacts'],
    sourceAccount: SOURCE_ACCOUNT_ID,
    sync: {
      [SOURCE_ACCOUNT_ID]: {
        id: 'people/364391',
        remoteRev: 'b157df42-792f-4a35-b79b-8309494476be'
      }
    }
  }
}

// contact that has been deleted on Google
const aureliaHayesDeletedOnGoogle = {
  id: 'aurelia-hayes-deleted-on-google',
  _type: 'io.cozy.contacts',
  _rev: '1f0eafe5-fa2b-482c-b9b9-ddb39792ae24',
  name: { givenName: 'Aurelia', familyName: 'Hayes' },
  cozyMetadata: {
    doctypeVersion: 2,
    createdAt: '2017-03-22T07:33:00.123Z',
    createdByApp: 'Contacts',
    createdByAppVersion: '2.0.0',
    updatedAt: '2018-11-12T18:18:00.222Z',
    updatedByApps: ['Contacts'],
    sourceAccount: SOURCE_ACCOUNT_ID,
    sync: {
      [SOURCE_ACCOUNT_ID]: {
        id: 'people/672617',
        remoteRev: 'ea79ad60-8c9f-4143-830f-07dfb260630b' // TODO: do we really have the same etag here?
      }
    }
  }
}

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
  {
    // contact that has been deleted on Google
    resourceName: 'people/672617',
    etag: 'ea79ad60-8c9f-4143-830f-07dfb260630b',
    names: [{ givenName: 'Aurelia', familyName: 'Hayes' }],
    metadata: { deleted: true }
  },
  {
    // contact that has been edited on Google
    resourceName: 'people/364391',
    etag: '209006ac-a425-426a-906e-3002d56597fa',
    names: [{ givenName: 'Scarlett', familyName: 'Kunde' }],
    metadata: { deleted: false }
  },
  {
    // contact that has been edited on both sides (conflict)
    resourceName: 'people/56863',
    etag: 'da455898-cffa-4ba5-988f-606243226509',
    names: [{ givenName: 'Clemens', familyName: 'Romaguera' }],
    emailAddresses: [
      {
        value: 'clemens@cozycloud.cc',
        formattedType: 'Personal',
        type: 'personal',
        metadata: {
          primary: true
        }
      }
    ],
    organizations: [
      {
        metadata: {
          primary: true
        },
        name: 'Cozy cloud'
      }
    ],
    metadata: { deleted: false }
  },
  {
    // contact that has been deleted on Google but does not exist anymore on cozy
    resourceName: 'people/66701',
    etag: '14a0de52-d1b2-4ab7-a39f-c686143b2fbd',
    names: [{ givenName: 'The invisible', familyName: 'Man' }],
    metadata: { deleted: true }
  },
  {
    // contact that has been deleted on Google AND edited on Cozy (conflict)
    resourceName: 'people/106666', // johanna-moen
    etag: 'bce9d37f-e0f9-44e6-8aa6-51fa8f8781cc',
    names: [{ givenName: 'Johanna', familyName: 'Moen' }],
    metadata: { deleted: true }
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
      etag: '963fd240-d568-4b24-9f26-6e658d4e4958',
      resourceName: 'people/96508'
    })
    googleUtils.createContact.mockResolvedValueOnce({
      etag: '6deab8dd-5a0f-451d-bcfe-fd81dd57bdcd',
      resourceName: 'people/78485'
    })
    googleUtils.updateContact.mockResolvedValueOnce({
      etag: '6020dd2f-c9b8-4865-bdbd-078faad65204',
      resourceName: 'people/229876' // john-doe-edited
    })
    googleUtils.deleteContact.mockResolvedValueOnce({
      etag: '440922abef-c9b8-4865-bdbd-85561aa7b',
      resourceName: 'people/924609' // fabiola-grozdana-deleted-in-cozy
    })

    fakeCozyClient.save = jest
      .fn(contact =>
        Promise.resolve({
          data: { id: contact.id }
        })
      )
      .mockName('cozySave')

    fakeCozyClient.destroy = jest.fn().mockName('cozyDestroy')

    cozyUtils.client = fakeCozyClient
    cozyUtils.prepareIndex = jest.fn()

    const googleContactsNotInCozy = ['people/751021', 'people/944070']
    cozyUtils.findContact = jest.fn((accountId, resourceName) => {
      if (googleContactsNotInCozy.includes(resourceName)) {
        return undefined
      } else if (resourceName === 'people/364391') {
        return scarlettGutkowski
      } else if (resourceName === 'people/672617') {
        return aureliaHayesDeletedOnGoogle
      }
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should synchronize contacts', async () => {
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
        deleted: 3,
        updated: 2
      },
      google: {
        created: 2,
        deleted: 1,
        updated: 1
      }
    })

    expect(fakeCozyClient.save).toHaveBeenCalledTimes(7)
    expect(fakeCozyClient.save.mock.calls[0]).toMatchSnapshot(
      'kayleighYundtInCozy'
    )
    expect(fakeCozyClient.save.mock.calls[1]).toMatchSnapshot(
      'adanMuellerInCozy'
    )

    expect(fakeCozyClient.save.mock.calls[2]).toMatchSnapshot(
      'scarlettKundeInCozy'
    )

    expect(fakeCozyClient.save.mock.calls[3]).toMatchSnapshot(
      'clemensRomagueraInCozy'
    )

    expect(fakeCozyClient.save.mock.calls[4]).toMatchSnapshot(
      'reinholdJenkinsInCozy'
    )
    expect(fakeCozyClient.save.mock.calls[5]).toMatchSnapshot(
      'larueCreminInCozy'
    )
    expect(fakeCozyClient.save.mock.calls[6]).toMatchSnapshot('johnDoeInCozy')

    expect(fakeCozyClient.destroy).toHaveBeenCalledTimes(3)

    expect(fakeCozyClient.destroy.mock.calls[0]).toMatchSnapshot(
      'destroyAureliaHayesInCozy'
    )

    expect(fakeCozyClient.destroy.mock.calls[1]).toMatchSnapshot(
      'destroyJohannaMoenInCozy'
    )

    expect(fakeCozyClient.destroy.mock.calls[2]).toMatchSnapshot(
      'destroyFabiolaGrozdanaInCozy'
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

    expect(googleUtils.deleteContact).toHaveBeenCalledTimes(1)
    expect(googleUtils.deleteContact.mock.calls[0]).toMatchSnapshot(
      'fabiolaGrozdanaInGoogle'
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
