"use strict";

module.exports = function(req, res, next){
	req.mongoMng.serverInfo(function(err, info){
		if(err)
			return next(err);
		
		res.render('serverinfo', info);
	});
};