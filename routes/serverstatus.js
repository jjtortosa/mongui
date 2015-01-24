"use strict";

module.exports = function(req, res, next){
	req.mongoMng.serverStatus(function(err, info){
		if(err)
			return next(err);
		
		res.render('serverstatus', {
			info: info
		});
	});
};