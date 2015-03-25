/* global module */

"use strict";

module.exports = function(req, res, next){
	req.mongoMng.dbsInfo(function(err, dbs){
		if(err)
			return next(err);
		
		res.render('dbs', {databases: dbs});
	});
};
