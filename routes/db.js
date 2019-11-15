"use strict";

const ObjectId = require('mongodb').ObjectID;
const merge = require('merge-descriptors');
const sanitize = require('../modules/sanitize');


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

	process() {
		const req = this.req;

		switch (this.locals.action) {
			case 'explain':
				let query = this.getQuery();

				if (!query)
					return req.res.json({error: 'Invalid query'});

				return this.collection.find(query).explain();
			case 'remove':
				if (req.query.criteria) {
					let query = this.getQuery();
					this.locals.criteria = req.query.criteria;

					if (!query)
						throw new Error('Invalid query');

					return this.getCollections()
						.then(() => this.collection.remove(query))
						.then(r => {
							this.locals.message = r.result.n + ' records affected'
						});
				}
				break;

			case 'update':
				return this.getCollections()
					.then(this.doUpdate.bind(this));

			case 'distinct':
				return this.getCollections()
					.then(this.distinct.bind(this));

			case 'findById':
			case 'find':
			default:
				return this.getCollections()
					.then(() => {
						if (!this.locals.collection) {
							if (!this.useMobile)
								return this.dbStats();

							this.view = 'collections';

							return;
						}

						if (this.locals.op)
							return this.colStats();

						return this.processCollection();
					});
		}
	}

	distinct() {
		const distinct = this.locals.distinct.trim();

		if (!distinct)
			return;

		const $match = {$match: this.getQuery()};
		const $group = {$group: {_id: "$" + distinct, count: {$sum: 1}}};

		return this.collection.aggregate([$match, $group])
			.toArray()
			.then(r => {
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
					this.locals.count = r.length;
					this.locals.message = this.locals.ml.results.replace('%d', r.length);
				}
			});
	}

	dbStats() {
		const req = this.req;

		switch (this.locals.op) {
			case 'stats':
				this.view = 'dbstats';

				return this.db.stats()
					.then(stats => {
						if(stats.ok === 1)
							stats.ok = "✓";

						this.locals.dbStats = sanitize.plainObj(stats);
					});

			case 'processlist':
				this.view = 'processlistdb';

				return req.mongoMng.currentOp({ns: new RegExp('^' + this.locals.dbname + '.')})
					.then(data => {
						this.locals.processlist = data.inprog;
					});

			case 'newcollection':
				this.view = 'newcollection';
				break;

			case 'command':
				this.view = 'dbcommand';
				break;

			case 'export':
				this.view = 'export';
				this.locals.selected = req.query.collections;
				this.locals.scripts.push('/js/export.js');
				break;

			case 'import':
				this.view = 'import';
				this.locals.msg = req.query.msg;
				break;

			case 'repair':
				this.view = 'repair';
				break;

			case 'auth':
				this.view = 'dbauth';
				this.locals.users = [];
				this.locals.scripts.push('/js/auth.js');

				//admin db
				return new Promise((ok, ko) => {
					req.mongoMng.db.collection('system.users')
						.find({db: this.locals.dbname}, (err, users) => {
							if(err)
								return ko(err);

							users.each((err, user) => {
								if (err || !user) {
									return ok();
								}
								this.locals.users.push(user);
							});
						});
				});

			case 'add-user':
				this.view = 'adduser';
				this.locals.err = req.query.err;
				this.locals.username = req.query.username;

				break;

			case 'dup':
				this.view = 'dupdb';
				this.locals.err = req.query.err;
				this.locals.name = req.query.name;
				break;

			default:
				return EMongo.notFound(this.locals.op);
		}
	}

	colStats() {
		const req = this.req;

		switch (this.locals.op) {
			case 'stats':
				this.view = 'colstats';
				return this.collection.stats()
					.then(stats => {
						this.locals.stats = stats;

						return this.mng.admin().command({top: 1});
					})
					.then(top => {
						this.locals.top = top.totals[this.db.databaseName + '.' + this.collection.collectionName];
					});
			case 'validate':
				this.view = 'validate';
				return this.db.command({validate: this.collection.collectionName, full: true})
					.then(validate => {
						this.locals.validate = validate;
					});
			case 'indexes':
				this.view = 'indexes';

				return this.collection.indexes()
					.then(r => {
						this.locals.indexes = r;

						if (!this.locals.scripts)
							this.locals.scripts = [];

						this.locals.scripts.push('/js/indexes.js');
					});
			case 'create-index':
				this.view = 'create-index';
				this.locals.scripts.push('/js/create-index.js');
				break;
			case 'rename':
				this.view = 'rename';
				break;
			case 'dup':
				this.view = 'dupcollection';
				this.locals.err = req.query.err;
				break;
			case 'insert':
				this.view = 'insert';
				this.locals.json = req.query.json || "{\n\n\n\n\n\n\n\n\n\n\n}";

				const msg = req.query.msg;

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
				break;
			case 'import':
				this.view = 'import';
				break;
			case 'error':
				this.view = 'collerror';
				this.locals.message = req.params.msg;
				break;
		}
	}

	getCollections() {
		this.locals.collections = [];

		return this.mng.getCollections(this.dbname)
			.then(collections => this.locals.collections = collections);
	}

	getQuery() {
		let query;

		this.locals.criteria = this.req.query.criteria || '{\n\t\n}';

		if (this.locals.action === "findById")
			return {_id: ObjectId(this.locals.byid)};

		if (!this.req.query.criteria)
			return {};

		try {
			eval('query=' + this.req.query.criteria.replace(/[\t\n\r]/g, ''));

			//noinspection JSUnusedAssignment
			return query || new Error('Invalid query');
		} catch (e) {
			return e;
		}
	}

	/**
	 *
	 * @returns {Promise}
	 */
	getUpdateOperators() {
		return new Promise((ok, ko) => {
			this.locals.update = this.req.query.update || "{\n\t'$set': {\n\t\t\n\t}\n}";

			if (!this.req.query.update)
				return ok();

			try {
				let ret;

				eval('ret=' + this.req.query.update.replace(/[\t\n\r]/g, ''));

				if(!ret)
					return ko(new Error('Invalid update operators'));

				// noinspection JSUnusedAssignment
				ok(ret);
			} catch (e) {
				e.message = 'Update conditions error: ' + e.message;
				return ko(e);
			}
		});
	}

	async processCollection() {
		const req = this.req;
		const page = parseInt(req.query.page) || 1;
		let noIdAlt = 0;

		await this.getUpdateOperators();

		const fields = this.queryFields();

		this.locals.page = req.query.page || 1;

		const query = this.getQuery();

		if (query instanceof Error)
			throw query;

		await this.nativeFields();
		const cursor = await this.collection.find(query, fields);
		const count = await cursor.count();

		if (!count) {
			this.locals.message = this.locals.ml.noRecordsFound;
		} else {
			const pagesCount = Math.floor(count / EMongo.limit) + 1;

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
				this.locals.message = this.locals.ml.results.replace('%d', count);
		}

		const arr = await cursor
			.sort(this.sortFields())
			.limit(10)
			.skip((page - 1) * EMongo.limit)
			.toArray();

		arr.forEach(r => this.locals.result[r._id || noIdAlt++] = sanitize.obj(r, '', null, true));
	}

	doUpdate() {
		const req = this.req;

		return this.getUpdateOperators()
			.then(update => {
				let query = {};

				if (req.query.criteria) {
					query = this.getQuery();

					if (query instanceof Error)
						throw query;
				}

				return this.collection.update(query, update, {multi: true})
					.then(r => {
						if (r.result.ok)
							this.locals.message = req.res.locals.ml.rowsAffected + ': ' + r.result.nModified;

						this.queryFields();
						this.sortFields();
					})
					.then(this.nativeFields.bind(this))
					// hay que retornar null para que se pinte la página
					.then(() => null);
			});
	}

	queryFields() {
		const req = this.req;

		if (req.query.fields && typeof req.query.fields === 'string')
			req.query.fields = [req.query.fields];

		this.locals.fields = req.query.fields || [];

		return this.locals.fields;
	}

	sortFields() {
		const sort = this.req.query.sort || {_id: -1};

		this.locals.sortFields = new Array(4);

		let i = 0;

		for (let k in sort) {
			// noinspection JSUnfilteredForInLoop
			sort[k] = parseInt(sort[k]);
			// noinspection JSUnfilteredForInLoop
			this.locals.sortFields[i++] = {name: k, order: sort[k]};
		}

		return sort;
	}

	nativeFields() {
		return this.collection.findOne()
			.then(doc => this.locals.nativeFields = doc && Object.keys(doc));
	}

	static notFound(op){
		const err = new Error('Not Found ' + op);
		err.status = 404;

		throw err;
	}

	servePage(){
		return this.process()
			.then(this.render.bind(this))
			.catch(this.req.next.bind(this));
	}

	render(result) {
		const res = this.req.res;

		if(result)
			return res.send(result);

		if (this.useMobile)
			this.view = 'mobile/' + this.view;

		res.render(this.view, this.locals);
	}
}

EMongo.limit = 10;

module.exports = function(req){
	new EMongo(req).servePage();
};

