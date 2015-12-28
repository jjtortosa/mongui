# mongui 

MongoDB user interface inspired on [RockMongo](https://github.com/iwind/rockmongo)

[![npm version](https://badge.fury.io/js/mongui.png)](http://badge.fury.io/js/mongui)
[![GitHub version](https://badge.fury.io/gh/jjtortosa%2Fmongui.png)](http://badge.fury.io/gh/jjtortosa%2Fmongui)

[![NPM](https://nodei.co/npm/mongui.png?downloads=true&downloadRank=true)](https://nodei.co/npm/mongui/) [![NPM](https://nodei.co/npm-dl/mongui.png?months=6&height=3)](https://nodei.co/npm/mongui/)

## Installation

Download node at [nodejs.org](http://nodejs.org) and install it, if you haven't already.

```sh
npm install mongui --global
```

## Start mongui

```bash
$ mongui [port]
```

default port: 3101

## Usage

Setup config.json

Config file location search order:
- /etc/mongui/config.json
- /usr/local/etc/mongui/config.json
- ~/.mongui/config.json
- \[PWD\]/config.json
- config.json

Default user: "test", password: 1234
Leave users empty for no security check

Navigate to:
[http://localhost:3101/](http://localhost:3101/)

[![screenshot1](https://raw.githubusercontent.com/jjtortosa/mongui/master/screenshots/mongui_screenshot1_thumb.png)](https://raw.githubusercontent.com/jjtortosa/mongui/master/screenshots/mongui_screenshot1.png)

## Features

- Multilang. Language detected from browser.
  Currently only english & spanish. Default: english.
- Server statistics
- List processes
- Validate collection
- Field editor
- ...

## Dependencies

- [body-parser](https://github.com/expressjs/body-parser): Node.js body parsing middleware
- [cookie-parser](https://github.com/expressjs/cookie-parser): cookie parsing with signatures
- [debug](https://github.com/visionmedia/debug): small debugging utility
- [express](https://github.com/strongloop/express): Fast, unopinionated, minimalist web framework
- [express-session](https://github.com/expressjs/session): Simple session middleware for Express
- [html-entities](https://github.com/mdevils/node-html-entities): Faster HTML entities encode/decode library.
- [jade](https://github.com/jadejs/jade): A clean, whitespace-sensitive template language for writing HTML
- [mongodb](http://mongodb.github.io/node-mongodb-native/): MongoDB
- [serve-favicon](https://github.com/expressjs/serve-favicon): favicon serving middleware with caching

## Dev Dependencies


None


## License

MIT

