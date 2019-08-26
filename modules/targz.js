"use strict";

/**
 * Promisifies targz module
 */


const promisify = require("util").promisify;
const tgz = require('targz');

module.exports = {
	compress: promisify(tgz.compress),
	decompress: promisify(tgz.decompress)
};
