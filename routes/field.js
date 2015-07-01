/* global require, module */

var ObjectId = require('mongodb').ObjectID,
	MongoDoc = require('../modules/mongodoc');

module.exports = function(req, res, next){
	var col = req.collection
	,	fields = {_id: false}
	,	field = req.params.field
	,	id = req.params.id;
	
	if(ObjectId.isValid(req.params.id))
		id = ObjectId(req.params.id);
	
	fields[field] = true;

	col.findOne({_id: id}, fields, function(err, r){
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