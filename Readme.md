# mongui 

MongoDB user interface inspired on [RockMongo](https://github.com/iwind/rockmongo)

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

[http://localhost:3101/](http://localhost:3101/)

<img src="https://raw.githubusercontent.com/jjtortosa/mongui/master/screenshots/mongui_screenshot1.png" alt="screenshot1" width=500"/>

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
- [morgan](https://github.com/expressjs/morgan): http request logger middleware for node.js
- [serve-favicon](https://github.com/expressjs/serve-favicon): favicon serving middleware with caching

## Dev Dependencies


None


## License

MIT

