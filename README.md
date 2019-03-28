# [Cozy][cozy] cozy-konnector-google-contacts

## What's Cozy?

![Cozy Logo](https://cdn.rawgit.com/cozy/cozy-guidelines/master/templates/cozy_logo_small.svg)

[Cozy] is a platform that brings all your web services in the same private space. With it, your webapps and your devices can share data easily, providing you with a new experience. You can install Cozy on your own hardware where no one's tracking you.

## What's this new konnector?

This konnector let you import or synchronize your google contacts with your cozy.

## Open a Pull-Request

If you want to work on this konnector and submit code modifications, feel free to open pull-requests! See the [contributing guide][contribute] for more information about how to properly open pull-requests.

## How to use

To do anything in this repo, you will need to install [nodejs] (LTS version is fine).

You'll also need the latest version of yarn :

```sh
npm install --global yarn
```

Eventually, install the dependencies by running this in the repos folder:

```sh
yarn
```

### Cozy-konnector-libs

This connector uses [cozy-konnector-libs](https://github.com/konnectors/libs). You can find more documentation about it there.

### Google OAuth2

As we need to generate a Google OAuth2 token, we need a `CLIENT_ID` and `CLIENT_SECRET`.

To do that, we need to set up a project in the [Google Developer Console](https://console.developer.google.com/). Since the UI of the console evolves and has a localized UI, it's hard to be precise, but follow this general direction:

- Create a new project.
- Add new APIs to the project — we will need the Google+ API and the People API.
- Go to the credentials screen.
- Generate a new set of OAuth identifiers.
- Choose "web application" as a type, and add `http://localhost:3000/oauth2callback` as authorized callback URL.

You will then receive a client id and secret that you can paste in the [keys.json](./keys.json) file. To avoid commiting this file to source control, run `git update-index --assume-unchanged keys.json`.

### Getting an access token for development

Next, run `yarn token` to retrieve an access token we can use to talk to the Google APIs. This token, along with more information, will be inserted in the `./konnector-dev-config.json` file and provided to our connector in development mode.

This access token will eventually expire and the connector will no longer work. To renew it, run `yarn token --reset`.  

Information required to renew the token is kept in `~/.config/configStore/cozy-konnector-google.json`. This includes the `refresh_token`, which you can ony receive the *first* time you autorize the app. You can find more details about this [here](https://github.com/googleapis/google-api-nodejs-client/issues/750#issuecomment-304521450).

### Test the connector without a cozy-stack

Run the following command:

```sh
yarn standalone
```

The requests to the cozy-stack will be stubbed using the [./data/importedData.json] file as source of data and when cozy-client-js is asked to create or update data, this [./data/importedData.json] file will be updated.
The bills (or any file) will be saved in the [./dataj directory.

### Run the connector linked to a cozy-stack

First, specify the URL of your cozy-stack in the `./konnector-dev-config.json` file:

```
{
  "COZY_URL": "http://cozy.tools:8080",
  "fields": {
    …
  }
}
```

As a [temporary workaround](https://github.com/konnectors/libs/issues/400), we will also need to request a new permission. Add this to the `manifest.konnector` file in the permissions section:

```
"files": {
  "description": "Required to save files",
  "type": "io.cozy.files"
},
```

Next, run the following command

```sh
yarn dev
```

This command will register your konnector as an OAuth application to the cozy-stack.

If you want to connect to a different stack or renew the token used by the cozy OAuth client, simply delete the `./.token.json` file and run `yarn dev` again.

The files are saved in the [cozy-konnector-dev-root] directory of your cozy by default.

### Use the connector with local apps

For development purposes, you may need to run your connector from the home app or to check that the changes you made to `manifest.konnector` are correctly displayed in the store.

:warning: If you do not have [nsjail](https://github.com/google/nsjail) installed on your system, you'll have to configure the cozy-stack's server to run connectors directly with nodejs: if you don't already have a config file, copy example config from cozy-stack repository to create one in `~/.cozy/cozy.yaml`.

```
cp cozy-stack/cozy.example.yaml $HOME/.cozy/cozy.yaml
```

In this file, change the konnectors command to run connectors with node (you may need to use the absolute path):

```
konnectors:
  cmd: <path_to_your_cozy-stack>/cozy-stack/scripts/konnector-node-run.sh
```

Then, remove/comment lines about vault and mail service (SMTP).

Restart the `cozy-stack`.

To have the google connector available in the list of connectors, build it and install it :

```
yarn build
cozy-stack konnectors install google file://$PWD/build
```

Then you'll have to register the konnector's oauth system into the cozy-stack's server with the following (see it on [cozy/cozy-stack](https://github.com/cozy/cozy-stack/blob/master/docs/konnectors-workflow.md#example-google)):

```
curl -X PUT 'localhost:5984/secrets%2Fio-cozy-account_types'
curl -X PUT localhost:5984/secrets%2Fio-cozy-account_types/google -d '{ "grant_mode": "authorization_code", "client_id": "<CLIENT_ID>", "client_secret": "<CLIENT_SECRET>", "auth_endpoint": "https://accounts.google.com/o/oauth2/v2/auth?access_type=offline", "token_endpoint": "https://www.googleapis.com/oauth2/v4/token" }'
```

Finally, you'll need to register the correct `redirect_uri` to the [Google API Console](https://console.developers.google.com/apis/dashboard?pli=1).
Be sure to add the following URL in the [OAuth credentials setup page](https://console.developers.google.com/apis/credentials/oauthclient):

```
http://cozy.tools:8080/accounts/google/redirect
```

Where `cozy.tools:8080` is the url to join the cozy-stack's server.

Then, you can install the app you want to use with the connector, it should use your local build of the connector.
For example, you can install `cozy-home`, connect your Google account and run synchronization from the Home.

Note that each time you change something in the connector's code, you will need to rebuild it and update it on the stack side:

```
yarn build
cozy-stack konnectors update google file://$PWD/build
```

To have a better understanding of what happens, you may also need to activate debug mode on the stack (be aware that if you restart the stack you will need to re-enable debug mode):

```
cozy-stack instances debug cozy.tools:8080 true
```

### How does the cozy-stack run the connector ?

The cozy-stack runs the connector in a nsjail container to be sure it does not affect the environment.

The connector is run by calling yarn start with the following envrionment variables :

 - COZY_CREDENTIALS needs to be the result of `cozy-stack instances token-cli <instance name> <scope>`
 - COZY_URL is the full http or https url to your cozy
 - COZY_FIELDS is something like :
```javascript
{
  "data":{
    "attributes":{
      "arguments":{
        "account":"cf31eaef5d899404a7e8c3737c1c2d1f",
        "folder_to_save":"folderPathId",
        "slug":"mykonnector"
      }
    }
  }
}
```

The "account" field is the id of the record with doctype "io.cozy.accounts" which will be used as parameters for your konnector.

### Build (without Travis)

To be able to run the connector, the cozy stack needs a connector which is built into only one file, without needing to install its dependencies, this will be a lot faster to install.

There is a command in package.json to help you to do that : `yarn build`

This command uses [webpack] to bundle all the code needed by your connector into one file.

This will generate an index.js file in the build directory and add all files the connector will need.

You can deploy this build by using the specific script : `yarn deploy`

This command will commit and push your build in the branch `build` fo your project.

And your konnector can now be installed using the following url :

git://github.com/konnectors/cozy-konnector-google.git#build

### Build using Travis CI

This project contains a `.travis.yml` config file which allows you to build your connector automatically using [Travis-CI][travis].

You can follow these steps to enable building using Travis:

* On your [travis-ci.org][travis] account, find your project name (should be the same than your Github repository) and enable Travis by using the related checkbox.
* Once enabled, go to this project on Travis by clicking on it and go to the "Settings" menu by using the "More options" menu at the top right.
* Enable these three options:
    * "Build only if .travis.yml is present"
    * "Build branch updates" (run Travis after each branch update)
    * "Build pull request updates" (run Travis after each Pull Request update)
* Then, you have to generate a Github token in [your Github account settings](https://github.com/settings/tokens). Here is the [Github blog post about API token](https://github.com/blog/1509-personal-api-tokens). Don't forget to authorize the access to the repo scope like following: ![repo scope](https://cloud.githubusercontent.com/assets/10224453/26671128/aa735ec2-46b4-11e7-9cd0-25310100e05e.png)
* Then, add an environment variable (still in your Travis project settings) named `GITHUB_TOKEN` and use your previous generated Github token as value (We highly recommand you to __keep the checkbox "Display value in build log" to OFF value__ in order to keep your token value hidden in the Travis logs.)

Now Travis is ready to build your project, it should build it each time your push a commit in your repository or create a pull request.

> __Note:__ Travis will push your build to your `build` branch ONLY for commits made on your master branch (included PR merge commits). You can see the related Travis statement [here](https://github.com/cozy/cozy-konnector-template/blob/master/.travis.yml#L27).

### Standard

We use [standard] to format the `index.js` file. You can run it with:

```sh
yarn lint
```


### Get in touch

You can reach the Cozy Community by:

- Chatting with us on IRC [#cozycloud on Freenode][freenode]
- Posting on our [Forum]
- Posting issues on the [Github repos][github]
- Say Hi! on [Twitter]


License
-------

cozy-konnector-google is developed by Cozy Cloud and distributed under the [AGPL v3 license][agpl-3.0].

[cozy]: https://cozy.io "Cozy Cloud"
[agpl-3.0]: https://www.gnu.org/licenses/agpl-3.0.html
[freenode]: http://webchat.freenode.net/?randomnick=1&channels=%23cozycloud&uio=d4
[forum]: https://forum.cozy.io/
[github]: https://github.com/cozy/
[nodejs]: https://nodejs.org/
[standard]: https://standardjs.com
[twitter]: https://twitter.com/mycozycloud
[webpack]: https://webpack.js.org
[yarn]: https://yarnpkg.com
[travis]: https://travis-ci.org
[contribute]: CONTRIBUTING.md
