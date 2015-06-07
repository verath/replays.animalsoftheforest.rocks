# replays.animalsoftheforest.rocks

A node.js web app for fetching and storing dota2 replay files for longer periods of time.

## Installing
```
$ npm install
$ gulp
```

## Environment Variables
These variables must be set for the application to work.

| Name |  Description | Example Value |
| ---- | ------------ | ------------- |
| SITE_URL | The base URL of the site | `http://127.0.0.1:3000/` 
| STEAM_WEB_API_KEY | The [Steam Web API](http://steamcommunity.com/dev/apikey) key | `123abc` 
| MONGODB_CONNECTION_STRING | The MongoDB connection string | `mongodb://user:123@abc...` 
| AZURE_STORAGE_CONNECTION_STRING | The Azure Storage connection string | `somelongstring...`
| STEAM_ACC_ACCOUNT_NAME | A Steam username to use when signing in to dota | `user_name` 
| STEAM_ACC_PASSWORD | The password for the Steam username | `secret`
| COOKIE_SECRET | A secret key to sign sessions with | `not keyboard cat`

## Running
```
$ gulp
$ node dist/app.js
```

## Tech
* [ES6](https://github.com/lukehoban/es6features) - The app is built using ES6, and is compiled to ES5 via [Babel](http://babeljs.io).
* [Express 4](http://expressjs.com/) - As the webserver.
* MongoDB + [mongoose](http://mongoosejs.com/) - Primary database. 
* [Azure Storage](http://azure.microsoft.com/en-in/services/storage/) - Used both as a task queue for replay fetch requests, and as blob storage for the replays.
* [node-steam](https://github.com/seishun/node-steam) + [yasp-dota's fork of node-dota2](https://github.com/yasp-dota/node-dota2) for connecting to and fetching data from dota.


## Inspiration
[yasp-dota](https://github.com/yasp-dota/yasp) - Open Source Dota 2 Replay Parsing and Statistics. Much of the match details fetching required to get the replay url is based on what they have done with their "retreiver".

[node-express-mongoose-demo](https://github.com/madhums/node-express-mongoose-demo) - Parts of the initial app strucutre is based on this example. 
