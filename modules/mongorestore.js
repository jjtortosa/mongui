"use strict";

const spawn = require('child_process').spawn;
const fs = require('fs');
const tmp = require("./tmp");
const tgz = require('./targz');
const debug = require('debug')('mongui:restore');
//noinspection JSUnusedLocalSymbols
const l = console.log.bind(console);


module.exports = function(db, file){
	const options = {
		unsafeCleanup: true	//removes the created temporary directory, even when it's not empty
	};

	return tmp.dir(options)
		.then(r => {console.log(r);
			const path = r.name;
			const cleanupCallback = r.removeCallback;

			return tgz.decompress({src: file, dest: path + '/' + db})
				.then(() => new Promise((ok, ko) => {
					const p = spawn('mongorestore', ['--drop', '--noIndexRestore', path]);

					// stderr no sólo contiene errores
					let err = '';

					p.stderr.on('data', data => err += data);

					p.stdout.on('data', debug);

					p.on('exit', code => {
						debug('exit code %s', code);
						debug(err);
						cleanupCallback();

						if(code === 1)
							ko(new Error(err));
						else
							ok(code);
					});
				}));
		});
};