"use strict";

const spawn = require('child_process').spawn;
const fs = require('mz/fs');
const rmdir = require("./rmdir");
const tgz = require('./targz');
const out = '/tmp/dump';

/**
 * @todo error handling
 * @param {Array} args
 * @returns {Promise}
 */
const dump = args => {
	return new Promise((ok) => {
		args.push('--out');
		args.push(out);

		const mongodump = spawn('mongodump', args);

		mongodump.on('exit', ok);
	});
};

module.exports = function(db, collections){
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
		.then(() => Promise.all(processes.map(args => dump(args))))
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