"use strict";

/**
 * Promisifies tmp module
 */

const promisify = require("util").promisify;
const tmp = require('tmp');
const tmpdir = promisify(tmp.dir, {multiArgs: true});

module.exports = {
	dir: opt => tmpdir(opt).then(r => ({
		name: r[0],
		removeCallback: r[1]
	})),
	file: promisify(tmp.file),
	tmpName: promisify(tmp.tmpName),
	setGracefulCleanup: tmp.setGracefulCleanup
};
