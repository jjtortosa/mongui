
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
		case 'command':
			var command;
			
			if(!req.body.command)
				return res.send();
			
			eval('command=' + req.body.command);
			
			req.mongoMng.db.command(command, function(err, r){
				res.locals.result = err || r;
				res.send(err || r);
			});
			break;
		default:
			next();
	}
};