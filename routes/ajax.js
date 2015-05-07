/* global module */


module.exports = function ajax(req, res, next){
	function end(err, body){
		res.json(err ? {error: err.message} : body);
	}

	switch(req.params.op){
		case 'dropIndex':
			req.mongoMng
				.useDb(req.body.db)
				.collection(req.body.collection)
				.dropIndex(req.body.name, end);
			break;
		default:
			next();
	}
};