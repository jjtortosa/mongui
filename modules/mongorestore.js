"use strict";

const spawn = require('child_process').spawn;
const fs = require('fs');
const tmp = require("tmp");
const tgz = require('targz');


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

				var process = spawn('mongorestore', ['--dir', path + '/dump', '--drop']);

				//stderr no sólo contiene errores
				//		err = '';
				//		process.stderr.on('data', function (data) {
				//			err += data;
				//		});

				process.on('exit', code => {
					cleanupCallback();

					ok(code);
				});
			});
		});
	});
};