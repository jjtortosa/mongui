/* global module, require */

var spawn = require('child_process').spawn
,	fs = require('fs')
,	rmdir = require("./rmdir")
,	out = '/tmp/dump'
,	tgz = require('tar.gz');


function dump(args, cb){
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
	
}

module.exports = function(db, collections, cb){
	if(typeof db === 'function'){
		cb = db;
		db = null;
		collections = null;
	} else if(typeof collections === 'function'){
		cb = collections;
		collections = null;
	}
	
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
	
	processes.forEach(function(args){
		dump(args, function(err){
			if(err)
				lastError = err;
			
			if(++count === processes.length){
				if(lastError)
					return cb(lastError);
				
				if(!fs.readdirSync(out).length)
					return cb(new Error('dump not found'));
				
				var file = '/tmp/dump_';
				
				if(collections && collections.length === 1)
					file += collections[0] + '_';
				
				file += Date.now() + '.tar.gz';
				
				new tgz().compress(out, file, function(err){
					cb(err, file);
				});
			}
		});
	});
};