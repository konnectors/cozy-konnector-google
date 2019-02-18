const transpile = require('./transpiler')

describe('Transpile from google-contacts to io.cozy-contacts', () => {
  it('Simple test', () => {
    const source = require('../sample/alanturing.json')

    const transpiled = transpile.toCozy(source)
    expect(transpiled).toMatchSnapshot()
  })

  it('complete tests with `sample/*.json', () => {
    const source = require('../sample/google-contacts.json')

    const transpiled = source.map(row => ({
      doc: transpile.toCozy(row)
    }))
    expect(transpiled).toMatchSnapshot()
  })
})

const johnDoeContact = {
  id: '9ecfbf4b-20e7-4bac-87f1-eea53350857d',
  _id: '9ecfbf4b-20e7-4bac-87f1-eea53350857d',
  _type: 'io.cozy.contacts',
  _rev: '1-19c313536e8b27473aa26bf105b03269',
  address: [
    {
      formattedAddress: '94 Hinton Road 05034 Fresno, Singapore',
      label: 'Home',
      type: 'home',
      primary: true
    },
    {
      street: '426 Runolfsson Knolls',
      city: 'Port Easter',
      country: 'Cocos (Keeling) Islands',
      postcode: '84573',
      label: 'Work',
      type: 'work'
    }
  ],
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
  birthday: '1999-5-1',
  company: 'Cozy cloud',
  cozy: [
    {
      label: 'MyCozy',
      primary: true,
      url: 'https://johndoe.mycozy.cloud'
    }
  ],
  fullname: 'John Doe',
  name: {
    givenName: 'John',
    familyName: 'Doe'
  },
  metadata: {
    cozy: true,
    version: 1
  },
  note:
    'Atque cupiditate saepe omnis quos ut molestiae labore voluptates omnis.',
  phone: [
    {
      label: 'Work',
      number: '+33 (2)0 90 00 54 04',
      type: 'work',
      primary: true
    },
    {
      number: '+33 6 77 11 22 33',
      primary: false
    }
  ]
}

describe('Transpile from io.cozy.contacts to google-contacts', () => {
  it('should transpile a cozy contact to a google person', () => {
    const expected = {
      names: [
        {
          givenName: 'John',
          familyName: 'Doe'
        }
      ],
      emailAddresses: [
        {
          type: 'personal',
          value: 'john.doe@posteo.net',
          metadata: { primary: false }
        },
        {
          type: undefined,
          value: 'john.doe@cozycloud.cc',
          metadata: { primary: true }
        }
      ],
      phoneNumbers: [
        {
          value: '+33 (2)0 90 00 54 04',
          formattedType: 'Work',
          type: 'work',
          metadata: {
            primary: true
          }
        },
        {
          value: '+33 6 77 11 22 33',
          formattedType: undefined,
          type: undefined,
          metadata: {
            primary: false
          }
        }
      ],
      addresses: [
        {
          streetAddress: undefined,
          city: undefined,
          country: undefined,
          postalCode: undefined,
          formattedValue: '94 Hinton Road 05034 Fresno, Singapore',
          formattedType: 'Home',
          type: 'home',
          metadata: { primary: true }
        },
        {
          streetAddress: '426 Runolfsson Knolls',
          city: 'Port Easter',
          country: 'Cocos (Keeling) Islands',
          postalCode: '84573',
          formattedType: 'Work',
          formattedValue: undefined,
          type: 'work',
          metadata: { primary: false }
        }
      ],
      birthdays: [
        {
          metadata: {
            primary: true
          },
          date: { year: '1999', month: '5', day: '1' }
        }
      ],
      organizations: [
        {
          name: 'Cozy cloud'
        }
      ],
      biographies: [
        {
          contentType: 'TEXT_PLAIN',
          value:
            'Atque cupiditate saepe omnis quos ut molestiae labore voluptates omnis.'
        }
      ]
    }

    const actual = transpile.toGoogle(johnDoeContact)
    expect(actual).toEqual(expected)
  })
})
