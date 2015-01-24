module.exports = function(req, res){
	req.mongoMng.listDbs(function(err, dbs){
		res.render('command', {dbs: dbs});
	});
};