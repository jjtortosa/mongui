/* global module */

"use strict";

module.exports = function(req, res, next){
	if(req.useMobile)
		return res.render('mobile/dbs');
	
	req.mongoMng
		.serverInfo()
		.then(info => res.render('serverinfo', info))
		.catch(next);
};