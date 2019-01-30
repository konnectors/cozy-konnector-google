const synchronizeContacts = require('./synchronizeContacts')

describe('synchronizeContacts function', () => {
  it('should synchronize local and remote data', () => {
    const afterSave = jest.fn()
    const save = jest.fn()
    const findRemoteDocument = jest.fn()
    const shouldSave = jest.fn()
    const local = [
      {
        id: 'foo'
      },
      {
        id: 'bar'
      }
    ]

    const remote = [
      {
        id: 'bar'
      }
    ]

    const dumbStrategy = {
      afterSave,
      findRemoteDocument,
      save,
      shouldSave
    }

    synchronizeContacts(local, remote, dumbStrategy)
    // expect(findRemoteDocument).toHaveBeenCalledWith({ id: 'foo' }, [
    //   { id: 'bar' }
    // ])
    // expect(findRemoteDocument).toHaveBeenCalledWith({ id: 'bar' }, [
    //   { id: 'bar' }
    // ])

    expect(shouldSave).toHaveBeenCalledWith({ id: 'foo' })
    expect(shouldSave).toHaveBeenCalledWith({ id: 'bar' })
  })
})
