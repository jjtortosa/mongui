/* global module */

module.exports = function(req, res, next){
	var dbpath = '/db/' + req.mongoMng.db.databaseName;
	
	switch(req.body.op){
		case 'dropdb':
			req.mongoMng.db.dropDatabase(function(err, a){
				req.res.redirect('/');
			});
			break;
			
		case 'createCollection':
			if(!req.body.colname)
				return res.redirect(dbpath + '?op=newcollection');
			
			req.mongoMng.db.createCollection(req.body.colname, function(){
				res.redirect(dbpath + '/' + req.body.colname);
			});
			break;
			
		case 'export':
			var mongodump = require('../modules/mongodump.js');
			
			mongodump(req.params.db, JSON.parse(req.body.collections), function(err, file){
				if(err)
					return next(err);
				
				res.download(file);
			});
			break;
		
		default:
			next();
	}
};