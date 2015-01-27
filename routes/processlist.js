"use strict";

module.exports = function(req, res, next){
	res.locals.all = req.param('all') === '1';
	
	req.mongoMng.currentOp(res.locals.all || {}, function(err, data){
		if(err)
			return next(err);
		
		res.render('processlist', {processlist: data});
	});
};