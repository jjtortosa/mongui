"use strict";

module.exports = function(req, res){
	req.mongoMng.admin().replSetGetStatus(function(err, info){ l(err)
		res.render('replication', {
			info: info
		});
	});
};