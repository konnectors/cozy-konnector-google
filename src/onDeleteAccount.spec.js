const pLimit = require('p-limit')
const CozyUtils = require('./CozyUtils')
const { onDeleteAccount } = require('./onDeleteAccount')

const ACCOUNT_ID = 'a6209d49-c579-4f26-aed3-2b93e11d3e08'
const CONTACT_ACCOUNT_ID = 'a8b764f8-f981-4eca-babf-dbe272e9029b'

jest.mock('p-limit')

describe('onDeleteAccount', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  it('should remove account id on the related contact account', async () => {
    const cozyUtils = new CozyUtils()
    pLimit.mockReturnValue(f => f())
    cozyUtils.findContactAccount = jest.fn().mockResolvedValue({
      id: CONTACT_ACCOUNT_ID,
      lastSync: '2018-03-22T12:09:00.222Z',
      sourceAccount: ACCOUNT_ID
    })
    cozyUtils.save = jest.fn()
    cozyUtils.client = {
      destroy: jest.fn(),
      save: jest.fn()
    }
    cozyUtils.getTrashedContacts = jest.fn().mockResolvedValue([
      {
        id: 'john-doe'
      },
      {
        id: 'ulises-bergstrom'
      }
    ])

    await onDeleteAccount(ACCOUNT_ID, cozyUtils)
    expect(cozyUtils.save).toHaveBeenCalledWith({
      id: CONTACT_ACCOUNT_ID,
      lastSync: '2018-03-22T12:09:00.222Z',
      sourceAccount: null
    })
    expect(cozyUtils.client.destroy).toHaveBeenCalledWith({
      id: 'john-doe'
    })
    expect(cozyUtils.client.destroy).toHaveBeenCalledWith({
      id: 'ulises-bergstrom'
    })
    expect(pLimit).toHaveBeenCalledWith(50)
  })
})
