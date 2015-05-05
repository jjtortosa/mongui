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

	fs.readFile(dump.path, function(err, data){
		if(err)
			return next(err);

		fs.writeFile(tmp, data, function(err) {
			if(err)
				return next(err);

			mongorestore(tmp, function(err){
				if(err)
					return next(err);

				res.locals.msg = res.locals.ml.importSuccess;
				res.locals.dbname = req.params.db;

				req.mongoMng.getCollections(res.locals.dbname, function(err, collections){
					res.locals.collections = collections;

					res.render('import');
				});
			});
		});
	});
	// don't forget to delete all req.files when done

};