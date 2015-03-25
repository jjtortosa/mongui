

module.exports = function multilang(req,res,next){
	req.lang = req.acceptsLanguages('en','es') || 'en';
	
	res.locals.ml = require('../language/' + req.lang);
	
	next();
};