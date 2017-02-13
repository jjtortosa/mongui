"use strict";

const path = require('path');
const fs = require('fs');
const dir = path.dirname(__dirname);
const confLocations = [
	'/etc/mongui',
	'/usr/local/etc/mongui',
	path.join(process.env.HOME, '.mongui'),
	dir
];

module.exports = function(){
	let file;

	confLocations.some(function(loc){
		loc += '/config.json';

		return !!(file = fs.existsSync(loc) && loc);
	});

	if(!file){
		file = dir + '/config.json';
		fs.writeFileSync(file, fs.readFileSync(dir + '/config-default.json'));
		
		
//		throw new Error('Config file not found');
	}
	
	console.info('Config file "%s" loaded', file);
	
	const ret = require(file);
	
	//compat
	if(!ret.useMobile)
		ret.useMobile = require('../config-default').useMobile;
	
	return ret;
};