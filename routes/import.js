/* global module */

var fs = require('fs')
,	mongorestore = require('../modules/mongorestore.js');

module.exports = function(req, res, next){
	if(!req.files.dump)
		return next(new Error('File not found'));
	
	var dump = req.files.dump
	,	tmp = '/tmp/' + dump.originalFilename;
	
	if(fs.existsSync(tmp))
		fs.unlinkSync(tmp);
	
	fs.rename(dump.path, tmp, function(err){
		if(err)
			return next(err);
		
		mongorestore(tmp, function(err){
			if(err)
				return next(err);
			
			
			res.send(req.body);
		});
	});
	// don't forget to delete all req.files when done
	
};