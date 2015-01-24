var ObjectId = require('mongoose').Types.ObjectId
,	MongoDoc = require('../modules/mongodoc');

function ISODate(d){
	return new Date(d);
}

module.exports = function(req, res){
	var p = req.body.p && JSON.parse(req.body.p) || req.body,
		db = p.db && req.mongoMng.useDb(p.db),
		col = db && p.collection && db.collection(p.collection),
		query = {_id: ObjectId(p.id)};
	
	switch(p.op){
		case 'setField':
			var update = {$set: {}},
				value;
			
			switch(p.type){
				case 'number':
					value = Number(p.value);
					break;
				case 'binary':
					value = new Buffer(p.value, 'binary');
					break;
				case 'boolean':
				case 'mixed':
					eval('value=' + p.value);l(value)
					break;
				default:
					value = p.value;
			}
			
			update.$set[p.key] = value;
			
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
			
			eval('update = {$unset: {"' + p.key + '": ""}}');
			
			col.update(query, update, function(err, r){
				res.send({error: err && err.message, affected: r});
			});
			break;
		case 'createdb':
			if(!p.db)
				return res.redirect('/?op=createdb');
			
			db.createCollection('__dummy', {autoIndexId: false}, function(err, col){
				col.insert({dummy: 1}, function(err, r){
					col.drop();
					res.redirect('/');
				});
			});
			break;
		case 'createCollection':
			if(!p.colname)
				return res.redirect('/db/' + p.db + '?op=newcollection');
			
			db.createCollection(p.colname, function(){
				res.redirect('/db/' + p.db + '/' + p.colname);
			});
			break;
		case 'renameCollection':
			try{
				col.rename(req.body.name, function(err){
					if(err)
						res.redirect('/db/' + p.db + '/' + p.collection + '?op=rename&msg=' + err.message);
					else
						res.redirect('/db/' + p.db + '/' + req.body.name);
				});
			} catch(err){
				res.redirect('/db/' + p.db + '/' + p.collection + '?op=rename&msg=' + err.message);
			}
			break;
		case 'command':
			var command;
			
			if(!p.command)
				return res.send();
			
			eval('command=' + p.command);
			
			db.command(command, function(err, r){
				res.locals.result = err || r;
				res.send(err || r);
			});
			break;
		default:
			res.send({error: 'op not found'});
	};
};