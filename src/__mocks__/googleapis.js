const googleapis = jest.genMockFromModule('googleapis')

const createContact = jest.fn(() =>
  Promise.resolve({ data: 'The contact was created' })
)
const updateContact = jest.fn(() =>
  Promise.resolve({ data: 'The contact was updated' })
)

class FakeOAuth2 {}

googleapis.google.auth = {
  OAuth2: FakeOAuth2
}

googleapis.google.people = jest.fn(() => ({
  people: {
    createContact: createContact,
    updateContact: updateContact
  }
}))

googleapis.spies = {
  FakeOAuth2,
  createContact,
  updateContact
}

module.exports = googleapis
