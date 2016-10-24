/* global module */

"use strict";

module.exports = function(req, res){
	req.mongoMng.admin().replSetGetStatus()
		.then(r => res.locals.info = r)
		.catch(err => res.locals.message = err.message)
		.then(info => res.render('replication'));
};