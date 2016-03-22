"use strict";

const spawn = require('child_process').spawn;
const fs = require('fs');
const rmdir = require("./rmdir");
const out = '/tmp/dump';
const tgz = require('targz');


const dump = (args, cb) => {
	args.push('--out');
	args.push(out);

	var err = ''
	,	mongodump = spawn('mongodump', args);

//    mongodump.stdout.on('data', function (data) {
//      console.log('stdout: ' + data);
//    });
//    mongodump.stderr.on('data', function (data) {
//		err += data;
//    });

    mongodump.on('exit', function (code) {
		cb(err && new Error(err), code);
    });

};

module.exports = function(db, collections){
	if(typeof collections === 'string')
		collections = [collections];
	
	var processes = []
	,	count = 0;
	
	if(!db)
		processes.push([]);
	else if(!collections)
		processes.push(['--db', db]);
	else {
		collections.forEach(function(c){
			processes.push(['--db', db, '--collection', c]);
		});
	}
	
	if(fs.existsSync(out))
		rmdir(out);
	
	var lastError;

	return new Promise((ok, ko) => {
		processes.forEach(function (args) {
			dump(args, function (err) {
				if (err)
					lastError = err;

				if (++count === processes.length) {
					if (lastError)
						return ko(lastError);

					if (!fs.readdirSync(out).length)
						return ko(new Error('dump not found'));

					var file = '/tmp/dump_';

					if (collections && collections.length === 1)
						file += collections[0] + '_';

					file += Date.now() + '.tgz';

					tgz.compress({src: out, dest: file}, err => {
						err ? ko(err) : ok(file);
					});
				}
			});
		});
	});
};