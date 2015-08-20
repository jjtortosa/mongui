/* global module */

module.exports = function(req, res, next){console.log(req.session.user);
	delete req.session.user;

	res.redirect('/');
};