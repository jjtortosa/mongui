/* global require, module, Error */

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

	this.useMobile = req.useMobile;
	this.view = 'results';
	this.locals = req.res.locals;
	
	merge(this.locals, {
		title: 'EucaMongo',
		action: req.params.action || req.query.action || 'find',
		op: req.params.op || req.query.op,
		byid: req.query.byid,
		distinct: req.query.distinct,
		err: req.params.err,
		scripts: []
	});

	if(this.locals.collection){
		this.collection = req.collection;
		this.locals.scripts.push('/js/search-string.js');
	} else if(!this.locals.collection && !this.locals.op && !this.useMobile)
		this.locals.op = 'stats';

	this.dbname = this.locals.dbname;

	this.db = req.db;
}

EMongo.limit = 10;

EMongo.prototype.process = function(next){
	var self = this
	,	req = this.req;

	switch(this.locals.action){
		case 'delete':
			this.collection.remove({_id: req.param('id')}, function(err, a){
				req.res.send(err || a);
			});
			break;
		case 'explain':
			var query = this.getQuery();

			if(!query)
				return req.res.json({error: 'Invalid query'});

			this.collection.find(query).explain(function(err, r){
				req.res.json(err || r);
			});
			break;
		case 'remove':
			if(req.query.criteria){
				query = this.getQuery();
				this.locals.criteria = req.query.criteria;

				if(!query)
					return next.call(this, new Error('Invalid query'));

				this.getCollections(function(){
					this.collection.remove(query, function(err, r){
						if(err)
							return next.call(self, err);

						self.locals.message = r + ' records affected';

						next.call(self, null);
					});
				});
			}
			break;
			
		case 'update':
			this.getCollections(function(){
				this.doUpdate(next);
			});
			break;
			
		case 'distinct':
			this.getCollections(function(){
				this.distinct(next);
			});
			break;
			
		case 'findById':
		case 'find':
		default:
			this.getCollections(function(){
				if(!this.locals.collection){
					if(!this.useMobile)
						return this.dbStats(next);
					
					this.view = 'collections';
					
					return next.call(self);
				}
				
				if(this.locals.op)
					return this.colStats(next);

				this.processCollection(next);
			});
	}
};

EMongo.prototype.distinct = function(next){
	var distinct = this.locals.distinct.trim();
	
	if(!distinct){
		return next.call(this);
	}
	
	var self = this;
	
	this.collection.aggregate([{ $group: { _id: "$" + distinct, count:{$sum:1}}  }], function(err, r){
		if(err)
			return next(err);
		
		if(!r.length)
			self.locals.message = self.locals.ml.noRecordsFound;
		else {
			r.forEach(function(o){
				o.val = JSON.stringify(o._id);
				o.criteria = '{"' + distinct + '":' + o.val + '}';
			});
			
			r.sort(function(a, b){
				return b.count - a.count;
			});
			
			self.locals.distinctResult = r;
		}
		
		next.call(self);
	});
};

EMongo.prototype.dbStats = function(next){
	var self = this
	,	req = this.req;

	switch(this.locals.op){
		case 'stats':
			this.view = 'dbstats';

			this.db.stats(function(err, stats){
				self.locals.dbStats = sanitizePlainObj(stats);

				next.call(self);
			});
			break;
			
		case 'processlist':
			this.view = 'processlistdb';

			this.db.collection('$cmd.sys.inprog').findOne({ns: new RegExp('^' + this.locals.dbname + '.')}, function(err, data){
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
			this.locals.selected = req.query.collections;
			this.locals.scripts.push('/js/export.js');
			next.call(this);
			break;
			
		case 'import':
			this.view = 'import';
			this.locals.msg = req.query.msg;
			next.call(this);
			break;
			
		case 'repair':
			this.view = 'repair';
			next.call(this);
			break;
			
		case 'auth':
			this.view = 'dbauth';
			self.locals.scripts.push('/js/auth.js');
					
			//admin db
			req.mongoMng.db.collection('system.users').find({db: self.locals.dbname}, function(err, users){
				if(err)
					return next.call(self, err);
				
				self.locals.users = [];

				users.each(function(err, user){
					if(err || !user)
						return next.call(self);

					self.locals.users.push(user);
				});
			});
			break;
			
		case 'add-user':
			this.view = 'adduser';
			this.locals.err = req.query.err;
			this.locals.username = req.query.username;
			
			next.call(self);
			break;
			
		case 'dup':
			this.view = 'dupdb';
			this.locals.err = req.query.err;
			this.locals.name = req.query.name;
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
			this.collection.stats(function(err, stats){
				self.locals.stats = stats;

				self.mng.admin().command({top:1}, function(err, top){
					if(err)
						return next.call(self, err);

					self.locals.top = top.documents[0].totals[self.db.databaseName + '.' + self.collection.collectionName];

					next.call(self);
				});
			});
			break;
		case 'validate':
			this.view = 'validate';
			this.db.command({validate: this.collection.collectionName, full: true}, function(err, validate){
				if(err)
					return next.call(self, err);

				self.locals.validate = validate;
				next.call(self);
			});
			break;
		case 'indexes':
			this.view = 'indexes';

			this.collection.indexes(function(err, r){
				if(err)
					return next.call(self, err);

				self.locals.indexes = r;

				if(!self.locals.scripts)
					self.locals.scripts = [];

				self.locals.scripts.push('/js/indexes.js');

				next.call(self);
			});

			break;
		case 'create-index':
			this.view = 'create-index';
			this.locals.scripts.push('/js/create-index.js');
			next.call(self);
			break;
		case 'rename':
			this.view = 'rename';
			next.call(this);
			break;
		case 'dup':
			this.view = 'dupcollection';
			this.locals.err = req.query.err;
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
				default:
					self.locals.msg = msg;
			}

			next.call(this);
			break;
		case 'import':
			this.view = 'import';
			next.call(this);
			break;
		case 'error':
			this.view = 'collerror';
			self.locals.message = req.params.msg;
			next.call(this);
			break;
		default:
			next();
//			req.res.status(404).send('op ' + this.locals.op + ' not defined');
	}
};

EMongo.prototype.getCollections = function(next){
	var self = this;

	this.locals.collections = [];

	this.mng.getCollections(this.dbname, function(err, collections){
		if(err || !collections)
			return next.call(self, err, collections);

		self.locals.collections = collections;

		next.call(self);
	});
};

EMongo.prototype.getQuery = function(){
	var query;
	
	this.locals.criteria = this.req.query.criteria || '{\n\t\n}';
	
	if(this.locals.action === "findById")
		return {_id: ObjectId(this.locals.byid)};
	
	if(!this.req.query.criteria)
		return {};
	
	try{
		eval('query=' + this.req.query.criteria.replace(/[\t\n\r]/g, ''));

		//noinspection JSUnusedAssignment
		return query;
	} catch(e){
		return e;
	}
};

EMongo.prototype.getUpdateOperators = function(){

	this.locals.update = this.req.query.update || "{\n\t'$set': {\n\t\t\n\t}\n}";

	if(!this.req.query.update)
		return;
	
	try{
		var ret;

		eval('ret=' + this.req.query.update.replace(/[\t\n\r]/g, ''));

		//noinspection JSUnresolvedVariable
		return ret;
	} catch(e){
		return e;
	}
};

EMongo.prototype.processCollection = function(next){
	var self = this
	,	req = this.req
	,	query = {}
	,	fields = this.queryFields()
	,	sort = this.sortFields();

	this.getUpdateOperators();
	
	this.locals.page = req.query.page || 1;

	query = this.getQuery();

	if(query instanceof Error)
		return next.call(self, query);

	if(!query)
		return next.call(self, new Error('Invalid query'));

	var page = parseInt(req.query.page) || 1;

	this.nativeFields(function(err){
		if(err)
			return next.call(self, err);

		var cursor = self.collection.find(query, fields);
		
		cursor.count(function(err, count){
			if(err)
				return next.call(self, err);

			if(!count){
				self.locals.message = self.locals.ml.noRecordsFound;

				return next.call(self);
			}

			var pagesCount = Math.floor(count/EMongo.limit) + 1;

			self.locals.url = req.url.replace(/[?&]page=\d*/, '');

			self.locals.paginator = {
				page: page,
				first: Math.max(1, page-6),
				last: Math.min(pagesCount, page+6),
				total: pagesCount,
				url: self.locals.url + (self.locals.url.indexOf('?') !== -1 ? '&' : '?') + 'page='
			};

			self.locals.count = count;
			self.locals.result = {};
			
			if(self.locals.action !== 'findById')
				self.locals.message = self.locals.ml.recordsFound.replace('%d', count);

			cursor
				.sort(sort)
				.limit(10)
				.skip((page -1) * EMongo.limit)
				.each(function(err, r){
					if(err)
						return next.call(self, err);

					if(r)
						return self.locals.result[r._id] = sanitizeObj(r, '', null, true);

					next.call(self);
				});
		});
	});
};

EMongo.prototype.doUpdate = function(next){
	var self = this
	,	req = this.req
	,	query = {}
	,	update = this.getUpdateOperators();
	
	if(update instanceof Error){
		update.message = 'Update conditions error: ' + update.message;
		
		return next.call(self, update);
	}
	
	if(!update)
		return next.call(self, new Error('Invalid update operators'));

	if(req.query.criteria){
		query = this.getQuery();

		if(query instanceof Error)
			return next.call(self, query);

		if(!query)
			return next.call(self, new Error('Invalid query'));
	}
	
	this.collection.update(query, update, {multi: true}, function(err, r){
		if(err)
			return next.call(self, err);

		if(r.result.ok)
			self.locals.message = req.res.locals.ml.rowsAffected + ': ' + r.result.nModified;
		
		self.queryFields();
		self.sortFields();
		
		self.nativeFields(function(err){
			next.call(self, err);
		});
	});
};

EMongo.prototype.queryFields = function(){
	var req = this.req;
	
	if(req.query.fields && typeof req.query.fields === 'string')
		req.query.fields = [req.query.fields];
	
	this.locals.fields = req.query.fields || [];
	
	return this.locals.fields;
};

EMongo.prototype.sortFields = function(){
	var sort = this.req.query.sort || {_id: -1};

	this.locals.sortFields = new Array(4);

	var i = 0;

	for(var k in sort){
		sort[k] = parseInt(sort[k]);
		this.locals.sortFields[i++] = {name: k, order: sort[k]};
	}
	
	return sort;
};

EMongo.prototype.nativeFields = function(cb){
	var self = this;
	
	this.collection.findOne(function(err, doc){
		if(err || !doc)
			return cb(err);
		
		var fields = [];
		
		Object.keys(doc).forEach(function(k){
			fields.push(k);
		});
		
		self.locals.nativeFields = fields;
		
		cb(null, fields);
	});
};

EMongo.prototype.render = function(){
	var view = this.view;

	if(this.useMobile)
		view = 'mobile/' + view;
	
	this.req.res.render(view, this.locals);
};

module.exports = function(req, res, next){
	new EMongo(req).process(function(err){
		if(err)
			res.locals.err = err.message;

		this ? this.render() : next();
	});
};


// helper functions
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
		return {type: 'mixed', html: isNaN(obj) ? obj.toString() : 'ISODate("' + obj.toISOString() + '")'};

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

function sanitizeObj(obj, indent, parent, removeBrackets){
	var ret = removeBrackets ? '' : '{\n',
		nb = indent + (removeBrackets ? '' : '\t'),
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

	if(!removeBrackets)
		ret += indent + '}';
	
	return ret;
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