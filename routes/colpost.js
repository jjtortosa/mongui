var ObjectId = require('mongodb').ObjectID
,	MongoDoc = require('../modules/mongodoc');

function ISODate(d){
	return new Date(d);
}

module.exports = function(req, res, next){
	var col = req.mongoMng.collection
	,	dbpath = '/db/' + req.mongoMng.db.databaseName + '/';
	
	if(req.body.id)
		var query = {_id: ObjectId(req.body.id)};
	
	res.locals.op = req.body.op;
	
	switch(req.body.op){
		case 'truncate':
			col.remove({}, function(err, a){
				if(!err)
					return res.redirect(req.path);
				
				res.locals.message = err.message;
				
				req.mongoMng.getCollections(function(err, collections){
					res.render('collerror', {collections: collections});
				});
			});
			break;
		case 'drop':
			col.drop(function(err){
				var red = err ? req.path + '?err=' + err.message : '/db/' + res.locals.dbname;
				
				req.res.redirect(red);
			});
			break;
		case 'renameCollection':
			try{
				col.rename(req.body.name, function(err){
					if(err)
						res.redirect(dbpath + col.collectionName + '?op=rename&msg=' + err.message);
					else
						res.redirect(dbpath + req.body.name);
				});
			} catch(err){
				res.redirect(dbpath + col.collectionName + '?op=rename&msg=' + err.message);
			}
			break;
		case 'setField':
			var update = {$set: {}},
				value;
			
			switch(req.body.type){
				case 'number':
					value = Number(req.body.value);
					break;
				case 'binary':
					value = new Buffer(req.body.value, 'binary');
					break;
				case 'boolean':
				case 'mixed':
					eval('value=' + req.body.value);
					break;
				default:
					value = req.body.value;
			}
			
			update.$set[req.body.field] = value;

			col.update(query, update, function(err, r){
				res.send({error: err && err.message, affected: r});
			});
			break;
		case 'deleteRow':
			col.remove(query, function(err, r){
				res.send({error: err && err.message, affected: r});
			});
			break;
		case 'deleteField':
			var update;
			
			eval('update = {$unset: {"' + req.body.key + '": ""}}');
			
			col.update(query, update, function(err, r){
				res.send({error: err && err.message, affected: r});
			});
			break;
		case 'insert':
			var redirect = req.path + '?op=insert&json=' + encodeURIComponent(req.body.json);
			try{
				var json;
				
				eval('json = ' + req.body.json);

				if(!Object.keys(json).length)
					return req.res.redirect(req.path);

				col.insert(json, function(err, doc){
					res.redirect(redirect + '&msg=ok');
				});
			} catch(e){
				res.redirect(redirect + '&msg=parseError');
			}
			break;
		default:
			res.send('Op "' + req.body.op + '" not found');
	}
};