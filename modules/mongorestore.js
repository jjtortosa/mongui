"use strict";

const spawn = require('child_process').spawn;
const fs = require('fs');
const tmp = require("tmp");
const tgz = require('targz');
const debug = require('debug')('mongui:restore');


module.exports = function(file){
	const options = {
		unsafeCleanup: true	//removes the created temporary directory, even when it's not empty
	};

	return new Promise((ok, ko) => {
		tmp.dir(options, (err, path, cleanupCallback) => {
			if (err)
				return ko(err);

			tgz.decompress({src: file, dest: path}, err => {
				if (err)
					return ko(err);

				const p = spawn('mongorestore', ['--dir', path, '--drop']);

				// stderr no sólo contiene errores
				err = '';
				p.stderr.on('data', function (data) {
					err += data;
				});

				p.on('exit', code => {
					debug('exit code %s', code);
					debug(err);
					cleanupCallback();

					if(code === 1)
						ko(new Error(err));
					else
						ok(code);
				});
			});
		});
	});
};