const {
  BaseKonnector,
  requestFactory,
  saveFiles,
  addData
} = require("cozy-konnector-libs");
const clear = require("clear");
const figlet = require("figlet");
const chalk = require("chalk");
const googleHelper = require("./google");

module.exports = new BaseKonnector(withFakeFields(start));

function withFakeFields(callback) {
  return function(fields) {
    // googleHelper.resetConfigStore();
    return googleHelper.getTokens().then(callback);
  };
}

/**
 * @param  {} fields:
 * @param {} fields.access_token: a google access token
 * @param {} fields.refresh_token: a google refresh token
 */
async function start(fields) {
  const oAuth2Client = googleHelper.oAuth2Client;
  oAuth2Client.setCredentials({
    access_token: fields.access_token,
    refresh_token: fields.refresh_token
  });
  const contacts = await googleHelper.getConnectionsList(["names"]);
  // TODO: clean up, filter, and add information to contacts
  // TODO: add data with [addData](https://github.com/cozy/cozy-konnector-libs/blob/master/packages/cozy-konnector-libs/docs/api.md#adddata)
  // addData(contacts, 'io.cozy.contacts')
  if (contacts) {
    clear();
    console.log(
      chalk.yellow(
        figlet.textSync("Google Contacts", { horizontalLayout: "full" })
      )
    );
    if (contacts.totalPeople !== 1) {
      console.log(
        chalk`Found {green ${
          contacts.totalPeople
        } contacts} in your contacts list`
      );
      console.log(
        chalk`{gray Here is the first one:
          \n${JSON.stringify(contacts.connections[0], null, 2)}}`
      );
    }
  }
}
