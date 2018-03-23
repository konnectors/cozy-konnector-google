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
      address: getAddress(source)
    }
  }
}

module.exports = transpiler

function getAddress({ addresses = [] }) {
  return addresses.map(address => ({
    city: address.city,
    country: address.country,
    postcode: address.postalCode,
    street: address.streetAddress,
    primary: address.metadata.primary || false
  }))
}

function getBirthday({ birthdays = [] }) {
  return birthdays
    .filter(birthday => birthday.metadata.primary)
    .map(birthday => birthday.text)[0]
}

function getEmail({ emailAddresses = [] }) {
  return emailAddresses.map(email => ({
    address: email.value,
    primary: email.metadata.primary || false
  }))
}

function getPhone({ phoneNumbers = [] }) {
  return phoneNumbers.map(phone => ({
    number: phone.value,
    primary: phone.metadata.primary || false
  }))
}

function getGivenName({ names = undefined }) {
  return names ? names[0].givenName : ''
}

function getFamilyName({ names = undefined }) {
  return names
    ? names[0].familyName ? names[0].familyName : names[0].displayName
    : ''
}
