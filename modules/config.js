"use strict";

const path = require('path');
const fs = require('fs');
const dir = path.dirname(__dirname);
const confLocations = [
	'/etc/mongui',
	'/usr/local/etc/mongui',
	path.join(process.env.HOME, '.mongui'),
	dir
];

module.exports = function () {
	let file;

	confLocations.some(function (loc) {
		loc += '/config.json';

		return !!(file = fs.existsSync(loc) && loc);
	});

	if (!file)
		file = dir + '/config-default.json';

	console.info('Config file "%s" loaded', file);

	return require(file);
};
