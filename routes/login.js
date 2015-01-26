module.exports = function(req, res, next){
	if(req.method === 'POST'){
		var conf = req.app.get('conf');
		
		if(req.body.user === conf.user && req.body.pass === conf.pass){
			req.session.user = true;
			
			return res.redirect(req.session.referer || '/');
		}
	}
	
//	if(req.session.user)
//		return res.redirect('/');
	
	res.render('login');
};