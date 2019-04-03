const googleapis = jest.genMockFromModule('googleapis')

const createContact = jest.fn(() =>
  Promise.resolve({ data: 'The contact was created' })
)
const updateContact = jest.fn(() =>
  Promise.resolve({ data: 'The contact was updated' })
)
const get = jest.fn(() =>
  Promise.resolve({
    data: {
      resourceName: 'people/123456',
      etag: '6f5f3948-375c-4b7f-8d6b-241ccb0fba8f'
    }
  })
)

class FakeOAuth2 {}

googleapis.google.auth = {
  OAuth2: FakeOAuth2
}

googleapis.google.people = jest.fn(() => ({
  people: {
    createContact: createContact,
    updateContact: updateContact,
    get: get
  }
}))

googleapis.spies = {
  FakeOAuth2,
  createContact,
  updateContact,
  get
}

module.exports = googleapis
