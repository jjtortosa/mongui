/* global module */

"use strict";

module.exports = function(req, res, next){
	if(req.useMobile)
		return res.render('mobile/dbs');
	
	req.mongoMng.serverInfo(function(err, info){
		if(err)
			return next(err);
		
		res.render('serverinfo', info);
	});
};