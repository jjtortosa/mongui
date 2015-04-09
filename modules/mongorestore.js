/* global module, require */

var spawn = require('child_process').spawn
,	fs = require('fs')
,	rmdir = require("./rmdir")
,	tgz = require('tar.gz');


module.exports = function(file, cb){
	var tmp = '/tmp/mongorestore';
	
	new tgz().extract(file, tmp, function(err){
		if(err)
			return cb(err);
		
		err = '';
		
		var process = spawn('mongorestore', ['--dir', tmp + '/dump', '--drop']);
		
		//stderr no sólo contiene errores
//		process.stderr.on('data', function (data) {
//			err += data;
//		});
		
		process.on('exit', function (code) {
			cb(err && new Error(err), code);
		});
	});
};