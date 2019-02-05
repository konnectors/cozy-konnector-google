const _Date = Date

function mockDate(isoDate) {
  global.Date = class extends _Date {
    constructor() {
      return new _Date(isoDate)
    }
  }
}

function restoreDate() {
  global.Date = _Date
}

module.exports = {
  mockDate,
  restoreDate
}
