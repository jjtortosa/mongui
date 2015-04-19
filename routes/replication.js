/* global module */

"use strict";

module.exports = function(req, res){
	req.mongoMng.admin().replSetGetStatus(function(err, info){
		res.render('replication', {
			info: info
		});
	});
};