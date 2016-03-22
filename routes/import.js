"use strict";

var fs = require('fs')
,	mongorestore = require('../modules/mongorestore.js');

module.exports = function(req, res, next){
	if(!req.files.dump)
		return next(new Error('File not found'));

	mongorestore(req.files.dump.path)
		.then(() => {
			fs.unlink(req.files.dump.path);

			res.redirect('/db/' + req.params.db + '?op=import&msg=' + res.locals.ml.importSuccess);
		})
		.catch(next);
};