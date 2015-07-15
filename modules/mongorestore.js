/* global module, require */

var spawn = require('child_process').spawn
,	fs = require('fs')
,	tmp = require("tmp")
,	tgz = require('tar.gz');


module.exports = function(file, cb){
	var options = {
		unsafeCleanup: true	//removes the created temporary directory, even when it's not empty
	};
	
	tmp.dir(options, function _tempDirCreated(err, path, cleanupCallback) {
		if(err)
			return cb(err);
		
		new tgz().extract(file, path, function(err){
			if(err)
				return cb(err);

			err = '';

			var process = spawn('mongorestore', ['--dir', path + '/dump', '--drop']);

			//stderr no sólo contiene errores
	//		process.stderr.on('data', function (data) {
	//			err += data;
	//		});

			process.on('exit', function (code) {
				cleanupCallback();
				
				cb(err && new Error(err), code);
			});
		});
	});
};