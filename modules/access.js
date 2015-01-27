
module.exports = function access(req,res,next){
	var allowed = ['login', 'favicon.ico', 'robots.txt'];
	
	if(allowed.indexOf(req.path.substr(1)>-1))
		return next();
	
	req.session.referer = req.path;
	
	if(!req.session.user)
		return res.redirect('/login');
	
	next();
};