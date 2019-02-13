module.exports = {
  setupFiles: ['<rootDir>/jestHelpers/setup.js'],
  transform: {
    '^.+\\.(js|jsx)?$': '<rootDir>/babel-transformer.js',
    '^.+\\.konnector$': '<rootDir>/json-transformer.js'
  }
}
