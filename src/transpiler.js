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
      vendorId: source.resourceName
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
