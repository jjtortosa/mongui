
module.exports = function(req, res){
	var db = req.mongoMng.db;
	
	if(!req.body.dbname)
		return res.redirect('/?op=createdb');

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