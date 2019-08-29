"use strict";

const debug = require('debug')('mongui:server');
const {spawn} = require('child_process');
const fs = require('mz/fs');
const rmdir = require("./rmdir");
const tgz = require('./targz');
const out = '/tmp/dump';

/**
 * @todo error handling
 * @param {Array} args
 * @param {any} conf
 * @returns {Promise}
 */
const dump = (args, conf) => {
	return new Promise((ok, ko) => {
		args.push('--out', out);

		if(conf.mongouser)
			args.unshift('-u', conf.mongouser, '-p', conf.mongopass, '--authenticationDatabase', 'admin');

		const mongodump = spawn('mongodump', args);
		let stderr = '';

		mongodump.on('exit', (code) => {
			debug(stderr);

			if (code === 1)
				ko(new Error(stderr));
			else
				ok();
		});

		mongodump.stderr.on('data', (data) => {
			stderr += data;
		});

		mongodump.on('error', ko);
	});
};

module.exports = function(db, collections, conf){
	if(typeof collections === 'string')
		collections = [collections];

	const processes = [];

	if(!db)
		processes.push([]);
	else if(!collections)
		processes.push(['--db', db]);
	else {
		collections.forEach(function(c){
			processes.push(['--db', db, '--collection', c]);
		});
	}

	return fs.access(out, fs.constants.R_OK | fs.constants.W_OK)
		.then(() => rmdir(out), () => {})
		.then(() => Promise.all(processes.map(args => dump(args, conf))))
		.then(() => fs.readdir(out))
		.then(files => {
			if(!files.length)
				throw new Error('dump not found');

			let file = '/tmp/dump_';

			if (collections && collections.length === 1)
				file += collections[0] + '_';

			file += Date.now() + '.tgz';

			return tgz.compress({src: out + '/' + db, dest: file}).then(() => file);
		});
};
