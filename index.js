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

module.exports = new BaseKonnector(start);

async function start(fields) {
  // googleHelper.resetConfigStore();
  const tokens = await googleHelper.getTokens();
  const oAuth2Client = googleHelper.oAuth2Client;
  oAuth2Client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token
  });
  const contacts = await googleHelper.getConnectionsList(["names"]);
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
