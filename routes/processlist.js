"use strict";

module.exports = function(req, res, next){
	res.locals.all = req.query.all === '1';

	req.mongoMng.currentOp(res.locals.all || {})
		.then(data => {
			res.render('processlist', {processlist: data});
		})
		.catch(next);
};