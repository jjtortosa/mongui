var ObjectId = require('mongodb').ObjectID,
	MongoDoc = require('../modules/mongodoc');

module.exports = function(req, res){
	var col = req.mongoMng.db(req.query.db).collection(req.query.collection);
	
	switch(req.query.op){
		case 'getField':
			var fields = {_id: false};
			
			fields[req.query.key] = true;
			
			col.findOne({_id: ObjectId(req.query.id)}, fields, function(err, r){
				if(err || !r)
					return(err || r);
				
				var ret = r;
				
				req.query.key.split('.').forEach(function(part){
					if(part === '$id')
						part = 'oid';
					
					ret = ret[part];
				});
				
				ret = new MongoDoc(ret);
				
				res.send(err||ret.toSend());
			});
			break;
		default:
			res.send(req.query);
	}
};