/* global require, module, Error */

"use strict";

var ObjectId = require('mongodb').ObjectID
,	assert = require('assert')
,	Entities = require('html-entities').AllHtmlEntities
,	merge = require('merge-descriptors');

class EMongo {
	constructor(req) {
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

		if (this.locals.collection) {
			this.collection = req.collection;
			this.locals.scripts.push('/js/search-string.js');
		} else if (!this.locals.collection && !this.locals.op && !this.useMobile)
			this.locals.op = 'stats';

		this.dbname = this.locals.dbname;

		this.db = req.db;
	}

	process(next) {
		var req = this.req;

		switch (this.locals.action) {
			case 'explain':
				var query = this.getQuery();

				if (!query)
					return req.res.json({error: 'Invalid query'});

				this.collection.find(query).explain(function (err, r) {
					req.res.json(err || r);
				});
				break;
			case 'remove':
				if (req.query.criteria) {
					query = this.getQuery();
					this.locals.criteria = req.query.criteria;

					if (!query)
						return next.call(this, new Error('Invalid query'));

					this.getCollections(() => {
						this.collection.remove(query, (err, r) => {
							if (err)
								return next.call(this, err);

							this.locals.message = r + ' records affected';

							next.call(this);
						});
					});
				}
				break;

			case 'update':
				this.getCollections(function () {
					this.doUpdate(next);
				});
				break;

			case 'distinct':
				this.getCollections(function () {
					this.distinct(next);
				});
				break;

			case 'findById':
			case 'find':
			default:
				this.getCollections(() => {
					if (!this.locals.collection) {
						if (!this.useMobile)
							return this.dbStats(next);

						this.view = 'collections';

						return next.call(this);
					}

					if (this.locals.op)
						return this.colStats(next);

					this.processCollection(next);
				});
		}
	}

	distinct(next) {
		var distinct = this.locals.distinct.trim();

		if (!distinct)
			return next.call(this);

		this.collection.aggregate([{$group: {_id: "$" + distinct, count: {$sum: 1}}}], (err, r) => {
			if (err)
				return next(err);

			if (!r.length)
				this.locals.message = this.locals.ml.noRecordsFound;
			else {
				r.forEach(o => {
					o.val = JSON.stringify(o._id);
					o.criteria = '{"' + distinct + '":' + o.val + '}';
				});

				r.sort((a, b) => {
					return b.count - a.count;
				});

				this.locals.distinctResult = r;
			}

			next.call(this);
		});
	}

	dbStats(next) {
		var req = this.req;

		switch (this.locals.op) {
			case 'stats':
				this.view = 'dbstats';

				this.db.stats((err, stats) => {
					if(stats.ok === 1)
						stats.ok = "✓";

					this.locals.dbStats = sanitizePlainObj(stats);

					next.call(this);
				});
				break;

			case 'processlist':
				this.view = 'processlistdb';

				this.db.collection('$cmd.sys.inprog').findOne({ns: new RegExp('^' + this.locals.dbname + '.')}, (err, data) => {
					this.locals.processlist = data.inprog;

					next.call(this);
				});
				break;

			case 'newcollection':
				this.view = 'newcollection';
				next.call(this);
				break;

			case 'command':
				this.view = 'dbcommand';
				next.call(this);
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
				this.locals.scripts.push('/js/auth.js');

				//admin db
				req.mongoMng.db.collection('system.users').find({db: this.locals.dbname}, (err, users) => {
					if (err)
						return next.call(this, err);

					this.locals.users = [];

					users.each((err, user) => {
						if (err || !user)
							return next.call(this);

						this.locals.users.push(user);
					});
				});
				break;

			case 'add-user':
				this.view = 'adduser';
				this.locals.err = req.query.err;
				this.locals.username = req.query.username;

				next.call(this);
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
	}

	colStats(next) {
		var req = this.req;

		switch (this.locals.op) {
			case 'stats':
				this.view = 'colstats';
				this.collection.stats((err, stats) => {
					this.locals.stats = stats;

					this.mng.admin().command({top: 1}, (err, top) => {
						if (err)
							return next.call(this, err);

						this.locals.top = top.totals[this.db.databaseName + '.' + this.collection.collectionName];

						next.call(this);
					});
				});
				break;
			case 'validate':
				this.view = 'validate';
				this.db.command({validate: this.collection.collectionName, full: true}, (err, validate) => {
					if (err)
						return next.call(this, err);

					this.locals.validate = validate;
					next.call(this);
				});
				break;
			case 'indexes':
				this.view = 'indexes';

				this.collection.indexes((err, r) => {
					if (err)
						return next.call(this, err);

					this.locals.indexes = r;

					if (!this.locals.scripts)
						this.locals.scripts = [];

					this.locals.scripts.push('/js/indexes.js');

					next.call(this);
				});

				break;
			case 'create-index':
				this.view = 'create-index';
				this.locals.scripts.push('/js/create-index.js');
				next.call(this);
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
				this.locals.json = req.query.json || "{\n\n\n\n\n\n\n\n\n\n\n}";

				var msg = req.query.msg;

				switch (msg) {
					case 'parseError':
						this.locals.msg = 'Invalid json';
						break;
					case 'ok':
						this.locals.msg = 'Object successfully inserted';
						break;
					default:
						this.locals.msg = msg;
				}

				next.call(this);
				break;
			case 'import':
				this.view = 'import';
				next.call(this);
				break;
			case 'error':
				this.view = 'collerror';
				this.locals.message = req.params.msg;
				next.call(this);
				break;
			default:
				next();
//			req.res.status(404).send('op ' + this.locals.op + ' not defined');
		}
	}

	getCollections(next) {
		this.locals.collections = [];

		this.mng.getCollections(this.dbname, (err, collections) => {
			if (err || !collections)
				return next.call(this, err, collections);

			this.locals.collections = collections;

			next.call(this);
		});
	}

	getQuery() {
		var query;

		this.locals.criteria = this.req.query.criteria || '{\n\t\n}';

		if (this.locals.action === "findById")
			return {_id: ObjectId(this.locals.byid)};

		if (!this.req.query.criteria)
			return {};

		try {
			eval('query=' + this.req.query.criteria.replace(/[\t\n\r]/g, ''));

			//noinspection JSUnusedAssignment
			return query;
		} catch (e) {
			return e;
		}
	}

	getUpdateOperators() {
		this.locals.update = this.req.query.update || "{\n\t'$set': {\n\t\t\n\t}\n}";

		if (!this.req.query.update)
			return;

		try {
			var ret;

			eval('ret=' + this.req.query.update.replace(/[\t\n\r]/g, ''));

			//noinspection JSUnresolvedVariable
			return ret;
		} catch (e) {
			return e;
		}
	}

	processCollection(next) {
		var req = this.req
			, query = {}
			, fields = this.queryFields()
			, sort = this.sortFields();

		this.getUpdateOperators();

		this.locals.page = req.query.page || 1;

		query = this.getQuery();

		if (query instanceof Error)
			return next.call(this, query);

		if (!query)
			return next.call(this, new Error('Invalid query'));

		var page = parseInt(req.query.page) || 1;

		this.nativeFields(err => {
			if (err)
				return next.call(this, err);

			var cursor = this.collection.find(query, fields);

			cursor.count((err, count) => {
				if (err)
					return next.call(this, err);

				if (!count) {
					this.locals.message = this.locals.ml.noRecordsFound;

					return next.call(this);
				}

				var pagesCount = Math.floor(count / EMongo.limit) + 1;

				this.locals.url = req.url.replace(/[?&]page=\d*/, '');

				this.locals.paginator = {
					page: page,
					first: Math.max(1, page - 6),
					last: Math.min(pagesCount, page + 6),
					total: pagesCount,
					url: this.locals.url + (this.locals.url.indexOf('?') !== -1 ? '&' : '?') + 'page='
				};

				this.locals.count = count;
				this.locals.result = {};

				if (this.locals.action !== 'findById')
					this.locals.message = this.locals.ml.recordsFound.replace('%d', count);

				cursor
					.sort(sort)
					.limit(10)
					.skip((page - 1) * EMongo.limit)
					.each((err, r) => {
						if (err)
							return next.call(this, err);

						if (r)
							return this.locals.result[r._id] = sanitizeObj(r, '', null, true);

						next.call(this);
					});
			});
		});
	}

	doUpdate(next) {
		var req = this.req
			, query = {}
			, update = this.getUpdateOperators();

		if (update instanceof Error) {
			update.message = 'Update conditions error: ' + update.message;

			return next.call(this, update);
		}

		if (!update)
			return next.call(this, new Error('Invalid update operators'));

		if (req.query.criteria) {
			query = this.getQuery();

			if (query instanceof Error)
				return next.call(this, query);

			if (!query)
				return next.call(this, new Error('Invalid query'));
		}

		this.collection.update(query, update, {multi: true}, (err, r) => {
			if (err)
				return next.call(this, err);

			if (r.result.ok)
				this.locals.message = req.res.locals.ml.rowsAffected + ': ' + r.result.nModified;

			this.queryFields();
			this.sortFields();

			this.nativeFields(function (err) {
				next.call(this, err);
			});
		});
	}

	queryFields() {
		var req = this.req;

		if (req.query.fields && typeof req.query.fields === 'string')
			req.query.fields = [req.query.fields];

		this.locals.fields = req.query.fields || [];

		return this.locals.fields;
	}

	sortFields() {
		var sort = this.req.query.sort || {_id: -1};

		this.locals.sortFields = new Array(4);

		var i = 0;

		for (var k in sort) {
			sort[k] = parseInt(sort[k]);
			this.locals.sortFields[i++] = {name: k, order: sort[k]};
		}

		return sort;
	}

	nativeFields(cb) {
		this.collection.findOne((err, doc) => {
			if (err || !doc)
				return cb(err);

			var fields = [];

			Object.keys(doc).forEach(k => fields.push(k));

			this.locals.nativeFields = fields;

			cb(null, fields);
		});
	}

	render() {
		var view = this.view;

		if (this.useMobile)
			view = 'mobile/' + view;

		this.req.res.render(view, this.locals);
	}
}

EMongo.limit = 10;

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