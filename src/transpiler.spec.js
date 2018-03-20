const transpile = require('./transpiler')

describe('Transpile from google-contacts to io.cozy-contacts', () => {
  test('Simple test', () => {
    const source = {
      resourceName: 'people/c3745049716692310153',
      etag:
        '%Eh0BAgMEBQYHCAkKCwwNDg8QERITFBUXNRk0NyIlLhoMAQIDBAUGBwgJCgsMIgxiamRQSjM1Szlmbz0=',
      metadata: {
        sources: [
          {
            type: 'CONTACT',
            id: '33f916e00d9f5889',
            etag: '#bjdPJ35K9fo=',
            updateTime: '2018-03-20T10:18:37.332001Z'
          }
        ],
        objectType: 'PERSON'
      },
      names: [
        {
          metadata: {
            primary: true,
            source: {
              type: 'CONTACT',
              id: '33f916e00d9f5889'
            }
          },
          displayName: 'Michelle Seabury',
          familyName: 'Seabury',
          givenName: 'Michelle',
          displayNameLastFirst: 'Seabury, Michelle'
        }
      ],
      photos: [
        {
          metadata: {
            primary: true,
            source: {
              type: 'CONTACT',
              id: '33f916e00d9f5889'
            }
          },
          url:
            'https://lh3.googleusercontent.com/-XdUIqdMkCWA/AAAAAAAAAAI/AAAAAAAAAAA/4252rscbv5MrelSgWD1bjXDv9XX6A51FQIhkKAU0Q____________ARinr4L4______8B/s100/photo.jpg',
          default: true
        }
      ],
      birthdays: [
        {
          metadata: {
            primary: true,
            source: {
              type: 'CONTACT',
              id: '33f916e00d9f5889'
            }
          },
          date: {
            year: 1987,
            month: 10,
            day: 5
          },
          text: '1987-10-05'
        }
      ],
      addresses: [
        {
          metadata: {
            primary: true,
            source: {
              type: 'CONTACT',
              id: '33f916e00d9f5889'
            }
          },
          formattedValue:
            '46-198 E Elford St\nGreenville, SC 29601\nÉtats-Unis ',
          streetAddress: '46-198 E Elford St',
          city: 'Greenville',
          region: 'SC',
          postalCode: '29601',
          country: 'États-Unis',
          countryCode: 'US'
        }
      ],
      emailAddresses: [
        {
          metadata: {
            primary: true,
            source: {
              type: 'CONTACT',
              id: '33f916e00d9f5889'
            }
          },
          value: 'michelle.seabury@keysoft.me'
        },
        {
          metadata: {
            source: {
              type: 'CONTACT',
              id: '33f916e00d9f5889'
            }
          },
          value: 'mitch.neal@opticast.info'
        }
      ],
      phoneNumbers: [
        {
          metadata: {
            primary: true,
            source: {
              type: 'CONTACT',
              id: '33f916e00d9f5889'
            }
          },
          value: '+33 (6)0 80 49 75 59',
          canonicalForm: '+33608049755'
        },
        {
          metadata: {
            source: {
              type: 'CONTACT',
              id: '33f916e00d9f5889'
            }
          },
          value: '+33 (6)5 59 99 73 12',
          canonicalForm: '+33655999731'
        }
      ],
      memberships: [
        {
          metadata: {
            source: {
              type: 'CONTACT',
              id: '33f916e00d9f5889'
            }
          },
          contactGroupMembership: {
            contactGroupId: 'myContacts'
          }
        }
      ]
    }

    const expected = {
      id: '0b8e8901-fa22-4b1b-bb04-2446f0a29d13',
      key: '0b8e8901-fa22-4b1b-bb04-2446f0a29d13',
      value: { rev: '1-4229b791f9a8b897937ffdece8cdee4d' },
      doc: {
        _id: '0b8e8901-fa22-4b1b-bb04-2446f0a29d13',
        _rev: '1-4229b791f9a8b897937ffdece8cdee4d',
        address: [
          {
            city: 'Greenville',
            country: 'États-Unis',
            postcode: '29601',
            primary: true,
            street: '46-198 E Elford St'
          }
        ],
        birthday: '1987-10-05',
        email: [
          { address: 'michelle.seabury@keysoft.me', primary: true },
          { address: 'mitch.neal@opticast.info', primary: false }
        ],
        name: { familyName: 'Seabury', givenName: 'Michelle' },
        phone: [
          { number: '+33 (6)0 80 49 75 59', primary: true },
          { number: '+33 (6)5 59 99 73 12', primary: false }
        ]
      }
    }

    const transpiled = {
      ...expected,
      doc: {
        ...expected.doc,
        ...transpile.toCozy(source)
      }
    }

    // first we test some internal properties
    expect(transpiled.doc.name).toEqual(expected.doc.name)
    expect(transpiled.doc.phone).toEqual(expected.doc.phone)
    expect(transpiled.doc.email).toEqual(expected.doc.email)
    expect(transpiled.doc.birthday).toEqual(expected.doc.birthday)
    expect(transpiled.doc.address).toEqual(expected.doc.address)

    // finally we test the whole snapshot
    expect(transpiled).toMatchSnapshot()
  })

  test('complete tests with `sample/*.json', () => {
    const source = require('../sample/google-contacts.json')

    const transpiled = source.map(row => ({
      doc: transpile.toCozy(row)
    }))
    expect(transpiled).toMatchSnapshot()
  })
})
