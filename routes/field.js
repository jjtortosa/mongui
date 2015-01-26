var ObjectId = require('mongodb').ObjectID,
	MongoDoc = require('../modules/mongodoc');

module.exports = function(req, res){
	var col = req.mongoMng.db.collection(req.param('collection'))
	,	fields = {_id: false}
	,	field = req.param('field')
	,	id = req.param('id');

	fields[field] = true;

	col.findOne({_id: ObjectId(id)}, fields, function(err, r){
		if(err || !r)
			return res.json(err || r);

		var ret = r;

		field.split('.').forEach(function(part){
			if(part === '$id')
				part = 'oid';

			ret = ret[part];
		});

		ret = new MongoDoc(ret);

		res.json(err||ret.toSend());
	});
};