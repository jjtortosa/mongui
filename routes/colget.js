
module.exports = function(req, res, next){
	var col = req.mongoMng.collection;

	switch(req.body.op){
		case 'explain':
			col.remove({}, function(err, a){
				req.res.redirect(req.path);
			});
			break;
		default:
			res.send('Op "' + req.body.op + '" not found');
	}
};