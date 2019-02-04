const SCHEMA_VERSION = 1

const transpiler = {
  toCozy: source => {
    return {
      name: {
        familyName: getFamilyName(source),
        givenName: getGivenName(source)
      },
      phone: getPhone(source),
      email: getEmail(source),
      birthday: getBirthday(source),
      address: getAddress(source),
      metadata: {
        version: SCHEMA_VERSION,
        google: { metadata: source.metadata }
      },
      company: getCompany(source),
      note: getNote(source),
      vendorId: source.resourceName
    }
  },
  toGoogle: source => {
    return {
      names: getNames(source),
      emailAddresses: getEmailAddresses(source),
      phoneNumbers: getPhoneNumbers(source),
      addresses: getAddresses(source),
      birthdays: getBirthdays(source),
      organizations: getOrganizations(source),
      userDefined: getUserDefined(source)
    }
  }
}

module.exports = transpiler

function getAddress({ addresses = [] }) {
  return addresses.map(
    address =>
      address && {
        city: address.city,
        country: address.country,
        postcode: address.postalCode,
        street: address.streetAddress,
        primary: address.metadata.primary || false,
        type: address.type,
        label: address.formattedType
      }
  )
}

function getBirthday({ birthdays = [] }) {
  return birthdays
    .filter(
      birthday => birthday && birthday.metadata && birthday.metadata.primary
    )
    .map(
      birthday =>
        birthday &&
        birthday.date &&
        /\d\d\d\d-\d\d-\d\d/.exec(
          new Date(Object.values(birthday.date).join('-')).toISOString()
        )[0]
    )[0]
}

function getEmail({ emailAddresses = [] }) {
  return emailAddresses.map(
    email =>
      email && {
        address: email.value,
        primary: email.metadata.primary || false,
        type: email.type,
        label: email.formattedType
      }
  )
}

function getPhone({ phoneNumbers = [] }) {
  return phoneNumbers.map(
    phone =>
      phone && {
        number: phone.value,
        primary: phone.metadata.primary || false,
        type: phone.type,
        label: phone.formattedType
      }
  )
}

function getGivenName({ names = undefined }) {
  return names && names[0] && names[0].givenName
}

function getFamilyName({ names = undefined }) {
  return names && names[0] && names[0].familyName
}

function getCompany({ organizations = undefined }) {
  return organizations && organizations[0].name
}

function getNote({ userDefined = undefined }) {
  return (
    (userDefined && userDefined.find(ud => ud.key === 'note').value) ||
    undefined
  )
}

// cozy -> google
function getNames({ name = undefined }) {
  return [name]
}

function getEmailAddresses({ email = [] }) {
  return email.map(email => ({
    metadata: {
      primary: email.primary
    },
    type: email.type,
    value: email.address
  }))
}

function getPhoneNumbers({ phone = [] }) {
  return phone.map(
    phoneItem =>
      phoneItem && {
        value: phoneItem.number,
        metadata: {
          primary: phoneItem.primary || false
        },
        type: phoneItem.type,
        formattedType: phoneItem.label
      }
  )
}

function getAddresses({ address = [] }) {
  return address.map(
    addressItem =>
      addressItem && {
        city: addressItem.city,
        country: addressItem.country,
        postalCode: addressItem.postcode,
        streetAddress: addressItem.street,
        metadata: {
          primary: addressItem.primary || false
        },
        type: addressItem.type,
        formattedType: addressItem.label,
        formattedValue: addressItem.formattedAddress
      }
  )
}

function getBirthdays({ birthday = null }) {
  if (!birthday) {
    return []
  }

  const [year, month, day] = birthday.split('-')
  return [
    {
      date: {
        year,
        month,
        day
      },
      metadata: {
        primary: true
      }
    }
  ]
}

function getOrganizations({ company = undefined }) {
  return (
    company && [
      {
        name: company
      }
    ]
  )
}

function getUserDefined({ note = undefined }) {
  return (
    note && [
      {
        key: 'note',
        value: note
      }
    ]
  )
}
