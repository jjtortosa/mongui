/* global module */

module.exports = function multilang(req,res,next){
	if(req.query.changeLang){
		req.session.lang = req.query.changeLang;

		return res.redirect(req.path);
	}

	req.lang = req.session.lang || req.acceptsLanguages('en','es') || 'en';

	res.locals.ml = require('../language/' + req.lang);

	next();
};