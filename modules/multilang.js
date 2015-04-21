/* global module */

module.exports = function multilang(app){
	app.locals.langs = {
		es: "Español",
		en: "English"
	};

	return function multilang(req,res,next){
		if(req.query.changeLang){
			if(!app.locals.langs[req.query.changeLang])
				return next(new Error('Langcode ' + req.query.changeLang + ' unavailable'));
			
			req.session.lang = req.query.changeLang;

			return res.redirect(req.path);
		}

		req.lang = res.locals.lang = req.session.lang || req.acceptsLanguages('en','es') || 'en';

		res.locals.ml = require('../language/' + req.lang);

		next();
	};
};