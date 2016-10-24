"use strict";

module.exports = function(req, res, next){
	req.mongoMng.serverStatus()
		.then(info => res.render('serverstatus', {info: info}))
		.catch(next);
};