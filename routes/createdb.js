"use strict";

module.exports = function(req, res, next){
	if(!req.body.db){
		res.locals.err = req.params.err;
		res.locals.db = req.params.db;
		
		return res.render('createdb');
	}
	
	let db = req.mongoMng;

	try{
		db = db.useDb(req.body.db);
	} catch(e){
		return res.redirect('/createdb?err=' + encodeURI(e.message + '&db=' + req.body.db));
	}

	db.createCollection('mycol', {autoIndexId: false})
		.then(col => col.insert({text: "A mongo database should have at least one document."}))
		.then(() => res.redirect('/db/' + req.body.db))
		.catch(next);
};
