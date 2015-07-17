/* global module */

var fs = require('fs')
,	mongorestore = require('../modules/mongorestore.js');

module.exports = function(req, res, next){
	if(!req.files.dump)
		return next(new Error('File not found'));

	mongorestore(req.files.dump.path, function(err){
		fs.unlinkSync(req.files.dump.path);

		if(err)
			return next(err);

		res.redirect('/db/' + req.params.db + '?op=import&msg=' + res.locals.ml.importSuccess);
	});
};