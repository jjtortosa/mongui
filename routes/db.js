"use strict";

var ObjectId = require('mongodb').ObjectID
,	assert = require('assert')
,	Entities = require('html-entities').AllHtmlEntities
,	merge = require('merge-descriptors');

function EMongo(req){
	Object.defineProperties(this, {
		req: {value: req},
		mng: {value: req.mongoMng}
	});
	
	this.view = 'results';
	
	this.locals = req.res.locals;

	merge(this.locals, {
		title: 'EucaMongo',
		action: req.param('action'),
		op: req.param('op'),
		err: req.param('err')
	});

	if(!this.locals.collection && !this.locals.op)
		this.locals.op = 'stats';
}

EMongo.limit = 10;

EMongo.prototype.process = function(next){
	var req = this.req;
	
	if(this.locals.action)
		return this.action();
	
	this.listDbs(function(){
		this.getCollections(function(){
			if(!this.locals.collection)
				return this.dbStats(next);

			if(this.locals.op)
				return this.colStats(next);

			this.processCollection(next);
		});
	});
};

EMongo.prototype.listDbs = function(cb){
	var self = this;
	
	this.mng.listDbs(function(err, d){
		if(err)
			return cb.call(self, err);
		
		self.locals.dbs = [];
		
		d.forEach(function(n){
			self.locals.dbs.push(n.name);
		});
		
		cb.call(self, null, self.locals.dbs);
	});
};

EMongo.prototype.action = function(){
	var req = this.req;
	
	switch(this.locals.action){
		case 'delete':
			this.mng.collection.remove({_id: req.param('id')}, function(err, a){
				req.res.send(err || a);
			});
			break;
		case 'insert':
			var redirect = req.path + '?op=insert&json=' + encodeURIComponent(req.body.json);
			try{
				var json;
				
				eval('json = ' + req.body.json);

				if(!Object.keys(json).length)
					return req.res.redirect(req.path);

				this.mng.collection.insert(json, function(err, doc){
					req.res.redirect(redirect + '&msg=ok');
				});
			} catch(e){
				req.res.redirect(redirect + '&msg=parseError');
			}
			break;
		case 'explain':
			var query = this.getQuery();
			
			if(!query)
				return req.res.json({error: 'Invalid query'});
			
			this.mng.collection.find(query).explain(function(err, r){
				req.res.json(err || r);
			});
			break;
		default:
			req.res.send('Action not found');
	}
};

EMongo.prototype.dbStats = function(next){
	var self = this
	,	req = this.req;
	
	switch(this.locals.op){
		case 'stats':
			this.view = 'dbstats';
	
			this.mng.db.stats(function(err, stats){
				self.locals.dbStats = sanitizePlainObj(stats);

				next.call(self);
			});
			break;
		case 'processlist':
			this.view = 'processlistdb';
			
			this.mng.db.collection('$cmd.sys.inprog').findOne({ns: new RegExp('^' + this.locals.dbname + '.')}, function(err, data){
				self.locals.processlist = data.inprog;
			
				next.call(self);
			});
			break;
		case 'newcollection':
			this.view = 'newcollection';
			next.call(this);
			break;
		case 'command':
			this.view = 'dbcommand';
			next.call(self);
			break;
		case 'export':
			this.view = 'export';
			next.call(this);
			break;
		case 'import':
			this.view = 'import';
			next.call(this);
			break;
		case 'repair':
			this.view = 'repair';
			next.call(this);
			break;
		case 'auth':
			this.view = 'dbauth';
			next.call(this);
			break;
		default:
			req.res.status(404).send('op ' + this.locals.op + ' not defined');
	}
};

EMongo.prototype.colStats = function(next){
	var self = this
	,	req = this.req;
	
	switch(this.locals.op){
		case 'stats':
			this.view = 'colstats';
			this.mng.collection.stats(function(err, stats){
				self.locals.stats = stats;
				
				self.mng.admin().command({top:1}, function(err, top){
					self.locals.top = top.documents[0].totals[self.mng.db.databaseName + '.' + self.mng.collection.collectionName];
					
					next.call(self);
				});
			});
			break;
		case 'validate':
			this.view = 'validate';
			this.mng.db.command({validate: this.mng.collection.collectionName, full: true}, function(err, validate){
				self.locals.validate = validate;
				next.call(self);
			});
			break;
		case 'indexes':
			this.view = 'indexes';
			next.call(this);
			break;
		case 'rename':
			this.view = 'rename';
			next.call(this);
			break;
		case 'dup':
			this.view = 'dup';
			next.call(this);
			break;
		case 'insert':
			this.view = 'insert';
			self.locals.json = req.param('json') || "{\n\n\n\n\n\n\n\n\n\n\n}";
			
			var msg = req.param('msg');
			
			switch(msg){
				case 'parseError':
					self.locals.msg = 'Invalid json';
					break;
				case 'ok':
					self.locals.msg = 'Object successfully inserted';
					break;
			}
				
			next.call(this);
			break;
		default:
			req.res.status(404).send('op ' + this.locals.op + ' not defined');
	}
};

EMongo.prototype.getCollections = function(next){
	var self = this
	,	req = this.req;
	
	this.locals.collections = [];
		
	this.mng.db.collections(function(err, collections){
		assert.ifError(err);

		if(!collections.length)
			return next.call(self);
		
		var count = 0;

		collections.forEach(function(c){
			c.count(function(err, t){
				self.locals.collections.push({name: c.collectionName, count: t});

				if(++count === collections.length){
					self.locals.collections.sort(function(a,b){
						return a.name > b.name ? 1 : -1;
					});

					next.call(self);
				}
			});
		});
	});
};

EMongo.prototype.getQuery = function(){
	var query;
	
	try{
		eval('query=' + this.req.query.criteria.replace(/[\t\n\r]/g, ''));
		
		return query;
	} catch(e){
		return;
	}
};

EMongo.prototype.processCollection = function(next){
	var self = this
	,	req = this.req
	,	query = {}
	,	fields = req.query.fields || {}
	,	sort = req.query.sort || {_id: -1};
	
	this.locals.criteria = req.query.criteria || '{\n\t\n}';
	this.locals.result = {};
	this.locals.page = req.query.page || 1;

	if(req.query.criteria){
		query = this.getQuery();
		
		if(!query)
			return next.call(self, new Error('Invalid query'));
	}
	
	var page = parseInt(req.query.page) || 1;
	
	var cursor = this.mng.collection
		.find(query, fields)
		.sort(sort).limit(10)
		.skip((page -1) * EMongo.limit);
		
	cursor.each(function(err, r){
		if(err)
			return next.call(self, err);
		
		if(r)
			return self.locals.result[r._id] = sanitize(r).html;
	
		cursor.count(function(err, count){
			var pagesCount = Math.floor(count/EMongo.limit) + 1;

			self.locals.paginator = {
				page: page,
				first: Math.max(1, page-6),
				last: Math.min(pagesCount, page+6),
				total: pagesCount
			};

			self.locals.count = count;
			self.locals.url = req.url.replace(/&page=\d*/, '');
			
			next.call(self);
		});
	});
};

EMongo.prototype.render = function(){
	this.req.res.render(this.view, this.locals);
};

module.exports = function(req, res){
	new EMongo(req).process(function(err){
		if(err)
			res.locals.err = err.message;
		
		this.render();
	});
};

function sanitize(obj, indent, parent){
	indent = indent || '';
	
	if(obj === null)
		return {type: 'null', html: null};
	
	if(Array.isArray(obj))
		return {type: 'array', html: sanitizeArray(obj, indent)};
	
	if(typeof obj === 'string')
		return {type: 'string', html: '"' + sanitizeString(obj, parent) + '"'};
	
	if(obj.constructor.name === 'ObjectID')
		return {type: 'mixed', html: 'ObjectId("' + obj + '")'};
	
	if(obj.constructor.name === 'Date')
		return {type: 'mixed', html: 'ISODate("' + obj.toISOString() + '")'};
	
	if(obj.constructor.name === 'Binary')
		return {type: 'binary', html: '"&lt;Mongo Binary Data&gt;"'};
	
	if(obj.constructor.name === 'DBRef'){
		var dbref = {
			$ref: obj.namespace,
			$id: obj.oid
		};
		
		if(obj.db)
			dbref.$db = obj.db;
		
		return {type: 'mixed', html: sanitizeObj(dbref, indent, parent)};
	}
	
	if(typeof obj === 'object')
		return {type: 'mixed', html: sanitizeObj(obj, indent, parent)};
	
	return {type: 'mixed', html: obj.toString()};
}

function sanitizeObj(obj, indent, parent){
	var ret = '{\n',
		nb = indent + '\t',
		keys = Object.keys(obj),
		dataParent = parent ? ' data-parent="' + parent + '"' : '',
		newParent = (parent ? parent + '.' : '');
	
	keys.forEach(function(k, i){
		var s = sanitize(obj[k], nb, newParent + k);
		
		ret += nb + '<a class="r-key"' + dataParent + ' href="#" data-type="' + s.type + '">' + k + '</a>: <span>' + s.html + '</span>';
		
		if(i < keys.length - 1)
			ret += ',';
		
		ret += '\n';
	});
	
	return ret + indent + '}';
}

function sanitizeArray(arr, indent){
	var nb = indent + '\t',
		tmp = [];
	
	arr.forEach(function(a){
		tmp.push(nb + sanitize(a, nb).html);
	});
	
	return '[\n' + tmp.join(',\n') + '\n' + indent + ']';
}

function sanitizePlainObj(obj){
	for(var k in obj){
		switch(typeof obj[k]){
			case 'number':
				if(obj[k] < 1024)
					break;
				
				if(obj[k] < 1024*1024){
					obj[k] = (obj[k]/1024).toFixed(2) + 'Kb';
					break;
				}
				
				obj[k] = (obj[k]/(1024*1024)).toFixed(2) + 'Mb';
				
				break;
			case 'object':
				obj[k] = JSON.stringify(obj[k]);
		}
	}
	
	return obj;
}

function sanitizeString(s, parent){
	var ent = new Entities()
	,	ret = ent.encode(s);
	
	if(ret.length > 240)
		ret = ret.substr(0, 240) + ' <a href="' + parent + '" class="moretext">[...]</a>';
	
	return ret;
}