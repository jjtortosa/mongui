
module.exports = function(req, res, next){
	if(!req.body.dbname){
		res.locals.err = req.param('err');
		res.locals.db = req.param('db');
		
		return res.render('createdb');
	}
	
	var db = req.mongoMng.db;

	try{
		db = db.db(req.body.dbname);
	} catch(e){
		return res.redirect('/?op=createdb&err=' + encodeURI(e.message + '&db=' + req.body.dbname));
	}

	db.createCollection('__dummy', {autoIndexId: false}, function(err, col){
		col.insert({dummy: 1}, function(err, r){
			col.drop();
			res.redirect('/db/' + req.body.dbname);
		});
	});
};