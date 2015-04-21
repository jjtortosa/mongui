/* global module */

module.exports = function access(req,res,next){
	if(req.path === '/login' || req.path === '/logout')
		return next();

	var conf = req.app.get('conf');

	if(!conf.users || !Object.keys(conf.users).length)
		return next();

	req.session.referer = req.path;

	if(!req.session.user)
		return res.redirect('/login');

	next();
};