"use strict";

module.exports = function(req, res){
	delete req.session.user;

	res.redirect('/');
};
