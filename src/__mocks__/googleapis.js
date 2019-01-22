const googleapis = jest.genMockFromModule('googleapis')

const createContact = jest.fn(() => Promise.resolve('ok'))

class FakeOAuth2 {}

googleapis.google.auth = {
  OAuth2: FakeOAuth2
}

googleapis.google.people = jest.fn(() => ({
  people: {
    createContact: createContact
  }
}))

googleapis.spies = {
  FakeOAuth2,
  createContact
}

module.exports = googleapis
