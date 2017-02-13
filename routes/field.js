"use strict";

const ObjectId = require('mongodb').ObjectID;
const MongoDoc = require('../modules/mongodoc');

module.exports = function(req, res, next){
	const col = req.collection;
	const fields = {_id: false};
	const field = req.params.field;
	const id = ObjectId.isValid(req.params.id) ? ObjectId(req.params.id) : req.params.id;
	const r = field.match(/^(.+)\.\d/);

	fields[r ? r[1] : field] = true;

	col.findOne({_id: id}, fields)
		.then(r => r || col.findOne({_id: req.params.id}, fields))
		.then(r => {
			if(!r)
				return next();

			let ret = r;

			field.split('.').forEach(part => {
				if(part === '$id')
					part = 'oid';

				ret = ret[part];
			});

			ret = new MongoDoc(ret);

			res.json(ret.toSend());
		})
		.catch(err => res.json(err));
};