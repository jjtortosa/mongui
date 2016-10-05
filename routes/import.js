"use strict";

const fs = require('fs');
const mongorestore = require('../modules/mongorestore.js');

module.exports = function(req, res, next){
	if(!req.files.dump)
		return next(new Error('File not found'));

	mongorestore(req.params.db, req.files.dump.path)
		.then(() => {
			fs.unlink(req.files.dump.path);

			res.redirect('/db/' + req.params.db + '?op=import&msg=' + res.locals.ml.importSuccess);
		})
		.catch(next);
};