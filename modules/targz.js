"use strict";

/**
 * Promisifies targz module
 */


const promisify = require("es6-promisify");
const tgz = require('targz');

module.exports = {
	compress: promisify(tgz.compress),
	decompress: promisify(tgz.decompress)
};