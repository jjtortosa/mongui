"use strict";

module.exports = function(req, res, next){
	if(req.param('op') === 'createdb'){
		return res.render('createdb');
	}
		
	req.mongoMng.dbsInfo(function(err, dbs){
		if(err)
			return next(err);
		
		res.render('dbs', {databases: dbs});
	});
};

