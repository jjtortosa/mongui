/* global module */

module.exports = function(req, res, next){
	var redirect = req.session.referer || '/';
	
	if(req.method === 'POST'){
		var conf = req.app.get('conf');
		
		res.locals.user = req.body.user;
	
		if(conf.users[req.body.user] === undefined)
			return res.render('login', {msg: res.locals.ml.userNotFound});
		
		if(conf.users[req.body.user] !== req.body.pass)
			return res.render('login', {msg: res.locals.ml.wrongPass});
		
		req.session.user = req.body.user;

		return res.redirect(redirect);
	}
	
	if(req.session.user)
		return res.redirect(redirect);
	
	res.render('login');
};