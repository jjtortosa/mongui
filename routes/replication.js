"use strict";

module.exports = function(req, res){
	req.mongoMng.admin().command({replSetGetStatus: 1})
		.then(r => res.locals.info = r)
		.catch(err => res.locals.message = err.message)
		.then(info => res.render('replication'));
};