"use strict";

module.exports = function(req, res, next){
	return res.status(401).send('forbidden');
	
	req.mongoMng.serverInfo(function(err, info){
		if(err)
			return next(err);
		
		res.render('serverinfo', info);
	});
};