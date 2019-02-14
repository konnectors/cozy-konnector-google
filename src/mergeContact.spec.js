const mergeContact = require('./mergeContact')

describe('mergeContact function', () => {
  describe('prefer google', () => {
    it('should update a simple field', () => {
      const cozyContact = {
        name: { givenName: 'John', familyName: 'Doe' }
      }
      const googleContact = {
        names: [
          {
            givenName: 'Peter',
            familyName: 'Doe'
          }
        ]
      }
      const result = mergeContact(cozyContact, googleContact, {
        preferGoogle: true
      })
      expect(result.name.givenName).toEqual('Peter')
      expect(result.name.familyName).toEqual('Doe')
    })

    it('should add simple field', () => {
      const cozyContact = {}
      const googleContact = {
        organizations: [
          {
            name: 'Cozy cloud'
          }
        ]
      }
      const result = mergeContact(cozyContact, googleContact, {
        preferGoogle: true
      })
      expect(result.company).toEqual('Cozy cloud')
    })

    it('should add a value and a label in a multiple field', () => {
      const cozyContact = {
        email: [
          {
            address: 'john.doe@posteo.net',
            label: 'Personal',
            type: 'personal',
            primary: false
          }
        ]
      }
      const googleContact = {
        emailAddresses: [
          {
            value: 'john.doe@posteo.net',
            formattedType: 'Personal',
            type: 'personal',
            metadata: {
              primary: false
            }
          },
          {
            value: 'john.doe@cozycloud.cc',
            formattedType: 'Professional',
            type: 'professional',
            metadata: {
              primary: true
            }
          }
        ]
      }
      const result = mergeContact(cozyContact, googleContact, {
        preferGoogle: true
      })
      expect(result.email).toEqual([
        {
          address: 'john.doe@posteo.net',
          label: 'Personal',
          type: 'personal',
          primary: false
        },
        {
          address: 'john.doe@cozycloud.cc',
          label: 'Professional',
          type: 'professional',
          primary: true
        }
      ])
    })

    it('should remove a value in a multiple field', () => {
      const cozyContact = {
        email: [
          {
            address: 'john.doe@posteo.net',
            label: 'Personal',
            type: 'personal',
            primary: false
          },
          {
            address: 'john.doe@cozycloud.cc',
            label: 'Professional',
            type: 'professional',
            primary: true
          }
        ]
      }
      const googleContact = {
        emailAddresses: [
          {
            value: 'john.doe@posteo.net',
            formattedType: 'Personal',
            type: 'personal',
            metadata: {
              primary: true
            }
          }
        ]
      }
      const result = mergeContact(cozyContact, googleContact, {
        preferGoogle: true
      })
      expect(result.email).toEqual([
        {
          address: 'john.doe@posteo.net',
          label: 'Personal',
          type: 'personal',
          primary: true
        }
      ])
    })

    it('should remove a label in a multiple field', () => {
      const cozyContact = {
        email: [
          {
            address: 'john.doe@posteo.net',
            label: 'Personal',
            type: 'personal',
            primary: true
          }
        ]
      }
      const googleContact = {
        emailAddresses: [
          {
            value: 'john.doe@posteo.net',
            metadata: { primary: true }
          }
        ]
      }
      const result = mergeContact(cozyContact, googleContact, {
        preferGoogle: true
      })
      expect(result.email).toEqual([
        {
          address: 'john.doe@posteo.net',
          primary: true
        }
      ])
    })

    it('should delete a simple field', () => {
      const cozyContact = {
        company: 'Cozy cloud'
      }
      const googleContact = {
        organizations: []
      }
      const result = mergeContact(cozyContact, googleContact, {
        preferGoogle: true
      })
      expect(result.company).toBeNull()
    })

    it('should delete a multiple field', () => {
      const cozyContact = {
        email: [
          {
            address: 'john.doe@posteo.net',
            label: 'Personal',
            type: 'personal',
            primary: true
          }
        ]
      }
      const googleContact = {
        emailsAddresses: []
      }
      const result = mergeContact(cozyContact, googleContact, {
        preferGoogle: true
      })
      expect(result.email).toEqual([])
    })

    it('should update a value in a multiple field', () => {
      const cozyContact = {
        email: [
          {
            address: 'john.doe@posteo.net',
            label: 'Personal',
            type: 'personal',
            primary: true
          }
        ]
      }
      const googleContact = {
        emailAddresses: [
          {
            value: 'john.doe@gmail.com',
            formattedType: 'Personal',
            metadata: {
              primary: true
            },
            type: 'personal'
          }
        ]
      }
      const result = mergeContact(cozyContact, googleContact, {
        preferGoogle: true
      })
      expect(result.email).toEqual([
        {
          address: 'john.doe@gmail.com',
          label: 'Personal',
          type: 'personal',
          primary: true
        }
      ])
    })
  })

  describe('prefer cozy', () => {
    it('should update a simple field', () => {
      const cozyContact = {
        name: { givenName: 'John', familyName: 'Doe' }
      }
      const googleContact = {
        names: [
          {
            givenName: 'Peter',
            familyName: 'Doe'
          }
        ]
      }
      const result = mergeContact(cozyContact, googleContact, {
        preferGoogle: false
      })
      expect(result.name.givenName).toEqual('John')
      expect(result.name.familyName).toEqual('Doe')
    })

    it('should add simple field', () => {
      const cozyContact = {
        company: 'Cozy cloud'
      }
      const googleContact = {}
      const result = mergeContact(cozyContact, googleContact, {
        preferGoogle: false
      })
      expect(result.company).toEqual('Cozy cloud')
    })

    it('should add a value and a label in a multiple field', () => {
      const cozyContact = {
        email: [
          {
            address: 'john.doe@posteo.net',
            type: 'personal',
            primary: false
          },
          {
            address: 'john.doe@cozycloud.cc',
            type: 'professional',
            primary: true
          }
        ]
      }
      const googleContact = {
        emailAddresses: [
          {
            value: 'john.doe@posteo.net',
            formattedType: 'Personal',
            type: 'personal',
            metadata: {
              primary: true
            }
          }
        ]
      }
      const result = mergeContact(cozyContact, googleContact, {
        preferGoogle: false
      })
      expect(result.email).toEqual([
        {
          address: 'john.doe@posteo.net',
          type: 'personal',
          primary: false
        },
        {
          address: 'john.doe@cozycloud.cc',
          type: 'professional',
          primary: true
        }
      ])
    })

    it('should remove a value in a multiple field', () => {
      const cozyContact = {
        email: [
          {
            address: 'john.doe@posteo.net',
            type: 'personal',
            primary: false
          }
        ]
      }
      const googleContact = {
        emailAddresses: [
          {
            value: 'john.doe@posteo.net',
            formattedType: 'Personal',
            metadata: { primary: true },
            type: 'personal'
          },
          {
            value: 'john.doe@cozycloud.cc',
            formattedType: 'Professional',
            metadata: { primary: false },
            type: 'professional'
          }
        ]
      }
      const result = mergeContact(cozyContact, googleContact, {
        preferGoogle: false
      })
      expect(result.email).toEqual([
        {
          address: 'john.doe@posteo.net',
          type: 'personal',
          primary: false
        }
      ])
    })

    it('should remove a label in a multiple field', () => {
      const cozyContact = {
        email: [
          {
            address: 'john.doe@posteo.net',
            primary: true
          }
        ]
      }
      const googleContact = {
        emailAddresses: [
          {
            value: 'john.doe@posteo.net',
            formattedType: 'Personal',
            type: 'personal',
            metadata: {
              primary: true
            }
          }
        ]
      }
      const result = mergeContact(cozyContact, googleContact, {
        preferGoogle: false
      })
      expect(result.email).toEqual([
        {
          address: 'john.doe@posteo.net',
          primary: true
        }
      ])
    })

    it('should delete a simple field', () => {
      const cozyContact = {
        company: undefined
      }
      const googleContact = {
        organizations: [{ name: 'Cozy cloud' }]
      }
      const result = mergeContact(cozyContact, googleContact, {
        preferGoogle: false
      })
      expect(result.company).toBeNull()
    })

    it('should delete a multiple field', () => {
      const cozyContact = {
        email: undefined
      }
      const googleContact = {
        emailAddresses: [
          {
            value: 'john.doe@posteo.net',
            formattedType: 'Personal',
            type: 'personal',
            metadata: {
              primary: true
            }
          }
        ]
      }
      const result = mergeContact(cozyContact, googleContact, {
        preferGoogle: false
      })
      expect(result.email).toBeNull()
    })

    it('should update a value in a multiple field', () => {
      const cozyContact = {
        email: [
          {
            address: 'john.doe@posteo.net',
            type: 'personal',
            primary: true
          }
        ]
      }
      const googleContact = {
        emailAddresses: [
          {
            value: 'john.doe@gmail.com',
            formattedType: 'Personal',
            type: 'personal',
            metadata: {
              primary: true
            }
          }
        ]
      }
      const result = mergeContact(cozyContact, googleContact, {
        preferGoogle: false
      })
      expect(result.email).toEqual([
        {
          address: 'john.doe@posteo.net',
          type: 'personal',
          primary: true
        }
      ])
    })
  })
})
