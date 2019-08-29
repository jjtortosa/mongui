"use strict";

const spawn = require('child_process').spawn;
const {ObjectId} = require('mongodb');
const tgz = require('./targz');
const rmdir = require("./rmdir");
const debug = require('debug')('mongui:restore');
//noinspection JSUnusedLocalSymbols
const l = console.log.bind(console);


module.exports = function(db, file, conf){
	const path = '/tmp/' + ObjectId();

	return tgz.decompress({src: file, dest: path + '/' + db})
		.then(() => new Promise((ok, ko) => {
			const args = ['--drop', '--noIndexRestore', path];

			if(conf.mongouser)
				args.unshift('-u', conf.mongouser, '-p', conf.mongopass, '--authenticationDatabase', 'admin');

			const p = spawn('mongorestore', args);

			// stderr no sólo contiene errores
			let err = '';

			p.stderr.on('data', data => err += data);

			p.stdout.on('data', debug);

			p.on('exit', code => {
				debug('exit code %s', code);
				debug(err);
				rmdir(path);

				if(code === 1)
					ko(new Error(err));
				else
					ok(code);
			});
		}))
		.catch(err => console.error(err));
};
