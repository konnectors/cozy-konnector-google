const ConfigStore = require("configstore");
const { google } = require("googleapis");
const OAuth2Client = google.auth.OAuth2;
const pkg = require("./package.json");
const http = require("http");
const url = require("url");
const querystring = require("querystring");
const opn = require("opn");

const googleHelper = (() => {
  function setupNewOAuth2Client() {
    const {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET
    } = require("./keys.json");
    const REDIRECT_URL = "http://localhost:3000/oauth2callback";
    const oAuth2Client = new OAuth2Client(
      CLIENT_ID,
      CLIENT_SECRET,
      REDIRECT_URL
    );
    return oAuth2Client;
  }

  return {
    oAuth2Client: this.oAuth2Client || setupNewOAuth2Client(),
    getGoogleCode: function() {
      return new Promise((resolve, reject) => {
        // Open an http server to accept the oauth callback. In this simple example, the
        // only request to our webserver is to /oauth2callback?code=<code>
        const server = http
          .createServer(async (req, res) => {
            if (req.url.indexOf("/oauth2callback") > -1) {
              // acquire the code from the querystring, and close the web server.
              const { code } = querystring.parse(url.parse(req.url).query);
              res.end(
                `Authentication successful! Please return to the console. [code: ${code}]`
              );
              server.close();
              resolve(code);
            }

            reject(new Error("oops", req, res));
          })
          .listen(3000, () => {
            // open the browser to the authorize url to start the workflow
            // Generate the url that will be used for the consent dialog.
            const authorizeUrl = this.oAuth2Client.generateAuthUrl({
              access_type: "offline",
              scope: ["https://www.googleapis.com/auth/contacts.readonly"]
            });
            opn(authorizeUrl);
          });
      });
    },
    getTokens: async function() {
      const conf = new ConfigStore(pkg.name);
      const storedTokens = conf.get("google.tokens");
      if (storedTokens) {
        return storedTokens;
      }
      const newTokens = await googleHelper
        .getGoogleCode()
        .then(code => this.oAuth2Client.getToken(code))
        .then(res => res.tokens);
      conf.set("google.tokens", newTokens);
      return newTokens;
    },
    resetConfigStore: () => {
      const conf = new ConfigStore(pkg.name);
      conf.delete("google.tokens");
    },
    getConnectionsList: function({ personFields = ["names"], ...options }) {
      const peopleAPI = google.people({
        version: "v1",
        auth: this.oAuth2Client
      });
      return new Promise((resolve, reject) => {
        peopleAPI.people.connections.list(
          { resourceName: "people/me", personFields, ...options },
          (err, res) => {
            if (err) {
              reject(err);
            } else {
              resolve(res.data);
            }
          }
        );
      });
    },
    getAllContacts: async function({
      personFields = ["names"],
      pageToken = null
    }) {
      try {
        const call = await this.getConnectionsList({
          personFields,
          pageToken
        });
        if (call.nextPageToken) {
          const nextPageResult = await this.getAllContacts({
            personFields,
            pageToken: call.nextPageToken
          });
          return [...call.connections, ...nextPageResult];
        } else {
          return [...call.connections];
        }
      } catch (err) {
        throw new Error("Unable to get all contacts", err);
      }
    }
  };
})();

module.exports = googleHelper;
