"use strict";

module.exports = function(req, res, next){
	if(req.param('op') === 'createdb'){
		res.locals.err = req.param('err');
		res.locals.db = req.param('db');
		
		return res.render('createdb');
	}
	
	res.locals.full = req.path === '/dbs';
	
	req.mongoMng.dbsInfo(res.locals.full, function(err, dbs){
		if(err)
			return next(err);
		
		res.render('dbs', {databases: dbs});
	});
};

