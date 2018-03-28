/*eslint no-console: 0 */
const ConfigStore = require('configstore')
const pkg = require('./package.json')
const http = require('http')
const url = require('url')
const querystring = require('querystring')
const opn = require('opn')
const { google } = require('googleapis')
const OAuth2Client = google.auth.OAuth2

const chalk = require('chalk')
const clear = require('clear')
const figlet = require('figlet')

const SCOPES = [
  'https://www.googleapis.com/auth/contacts.readonly',
  'https://www.googleapis.com/auth/userinfo.email'
]

function getGoogleCode(oAuth2Client) {
  return new Promise((resolve, reject) => {
    // Open an http server to accept the oauth callback. In this simple example, the
    // only request to our webserver is to /oauth2callback?code=<code>
    const server = http
      .createServer(async (req, res) => {
        if (req.url.indexOf('/oauth2callback') > -1) {
          // acquire the code from the querystring, and close the web server.
          const { code } = querystring.parse(url.parse(req.url).query)
          res.end(
            `Authentication successful! Please return to the console. [code: ${code}]`
          )
          server.close()
          resolve(code)
        }
        reject(new Error('oops', req, res))
      })
      .listen(3000, () => {
        // open the browser to the authorize url to start the workflow
        // Generate the url that will be used for the consent dialog.
        const authorizeUrl = oAuth2Client.generateAuthUrl({
          access_type: 'offline',
          scope: SCOPES
        })
        opn(authorizeUrl)
      })
  })
}

function setupNewOAuth2Client({
  client_id: CLIENT_ID,
  client_secret: CLIENT_SECRET
}) {
  const REDIRECT_URL = 'http://localhost:3000/oauth2callback'
  return new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL)
}

async function getTokens(oAuth2Client) {
  const conf = new ConfigStore(pkg.name)
  const storedTokens = conf.get('google.tokens')
  if (storedTokens) {
    console.log(
      chalk.green(
        'Found token in your config file. If you want to reset it, run with `--reset`.'
      )
    )
    return storedTokens
  }
  console.log(
    chalk.green(
      'Authenticating you, check out your browser to fill the form out…'
    )
  )
  const newTokens = await getGoogleCode(oAuth2Client)
    .then(code => oAuth2Client.getToken(code))
    .then(res => res.tokens)
  conf.set('google.tokens', newTokens)
  return newTokens
}

function resetConfigStore() {
  const conf = new ConfigStore(pkg.name)
  conf.delete('google.tokens')
}

function getFileContent(configFilename) {
  try {
    return require(`./${configFilename}`)
  } catch (err) {
    return {}
  }
}

function getKeys() {
  try {
    return require('./keys.json')
  } catch (ex) {
    console.log(
      chalk.red(
        'Unable to retrieve CLIENT_ID nor CLIENT_SECRET, please follow documentation to update keys.json file.'
      )
    )
    process.exit(-1)
  }
}

function getAccountInfo(oAuthClient) {
  const plus = google.plus('v1')
  return new Promise((resolve, reject) => {
    plus.people.get(
      {
        userId: 'me',
        auth: oAuthClient
      },
      (err, res) => {
        if (err) {
          reject(err)
        }
        resolve(res.data)
      }
    )
  })
}

clear()
console.log(
  chalk.yellow(
    figlet.textSync('Google API Helper', { horizontalLayout: 'full' })
  )
)

const KONNECTOR_DEV_CONFIG_FILE = 'konnector-dev-config.json'
const run = async () => {
  const {
    reset,
    filename: configFilename = KONNECTOR_DEV_CONFIG_FILE
  } = require('minimist')(process.argv.slice(2))
  reset && resetConfigStore()
  const keys = getKeys()
  const oAuthClient = await setupNewOAuth2Client(keys)
  const tokens = await getTokens(oAuthClient)
  require('fs').writeFileSync(
    `./${configFilename}`,
    JSON.stringify(
      {
        ...getFileContent(configFilename),
        fields: { ...tokens }
      },
      null,
      2
    )
  )
  oAuthClient.setCredentials(tokens)
  const accountInfo = await getAccountInfo(oAuthClient)
  console.log(
    chalk.green(
      `Find your credentials in ${configFilename} for ${
        accountInfo['emails'][0]['value']
      }`
    )
  )
}

run()
