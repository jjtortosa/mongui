"use strict";

const MongoClient = require('mongodb').MongoClient;
const events = require('events');
const debug = require('debug')('mongui:server');
const assert = require('assert');

class MongoMng extends events.EventEmitter {
	constructor(db) {
		super();

		this.db = db;
	}

	dbsInfo() {
		return this.listDbs()
			.then(databases => {
				return Promise.all(databases.map(db =>
					this.useDb(db.name).stats()
						.then(stats => {
							for (let i in stats)
								db[i] = stats[i];

							['storageSize', 'dataSize', 'indexSize', ''].forEach(k => db[k] = MongoMng.human(db[k]));

							db.ok = db.ok && '✓';

							return db;
						})
				));
			});
	}

	useDb(n) {
		return this.db.db(n);
	}

	admin() {
		return this.db.admin();
	}

	listDbs() {
		return this.admin()
			.listDatabases()
			.then(result => {
				const promises = result.databases.map(db => {
					db.sizeOnDisk = MongoMng.human(db.sizeOnDisk);

					return this.useDb(db.name).listCollections().toArray()
						.then(collections => db.collections = collections.length);
				});

				return Promise.all(promises)
					.then(() => result.databases.sort((a, b) => a.name > b.name ? 1 : -1));
			});
	}

	getCollections(db, cb) {
		const collections = [];

		this.useDb(db).collections((err, r) => {
			if (err)
				return cb.call(this, err);

			if (!r.length)
				return cb.call(this);

			let count = 0;

			r.forEach(c => {
				c.count((err, t) => {
					collections.push({name: c.collectionName, count: t});

					if (++count === r.length) {
						collections.sort((a, b) => a.name > b.name ? 1 : -1);

						cb.call(this, null, collections);
					}
				});
			});
		});
	}

	serverInfo() {
		const admin = this.admin();
		const ret = {};

		return admin.profilingLevel()
			.then(level => {
				ret.level = level;

				return admin.serverInfo();
			})
			.then(info => {
				ret.info = info;

				return admin.command({getCmdLineOpts: 1});
			})
			.then(opt => {
				const p = opt.parsed;

				ret.cmd = {
					argv: opt.argv.join(' '),
					config: p.config,
					net: JSON.stringify(p.net),
					dbPath: p.storage.dbPath,
					log: p.systemLog.path
				};

				return ret;
			});
	}

	serverStatus() {
		return this.admin().serverStatus();
	}

	currentOp(q) {
		return this.db.command({currentOp: q});
	}

	static human(n){
		const gb = 1024 * 1024 * 1024,
			mb = 1024 * 1024,
			kb = 1024;

		if(n > gb)
			return (n/gb).toFixed(2)+' Gb';

		if(n > mb)
			return (n/mb).toFixed(2)+' Mb';

		if(n > kb)
			return (n/kb).toFixed(2)+' Kb';

		return n + ' b';
	}
}

module.exports = app => {
	const conf = app.get('conf');
	let uri = 'mongodb://';

	if(conf.mongouser)
		uri += conf.mongouser + ':' + conf.mongopass + '@';

	uri += (conf.host || 'localhost') + '/admin';

	MongoClient.connect(uri)
		.then(db => {
			const mongoMng = new MongoMng(db);

			app.set('mongoMng', mongoMng);

			console.info('MongoDb - Connected');

			app.emit('dbconnected');
		})
		.catch(console.error.bind(console));

	return (req, res, next) => {
		req.mongoMng = app.get('mongoMng');

		const match = decodeURI(req.path).match(/^\/(db|import)\/([^\/]+)\/?([^\/]*)/);

		if(match){
			if(match && match[2]){
				res.locals.dbname = match[2];

				req.db = req.mongoMng.useDb(match[2]);

				if(match[3]){
					res.locals.collection = match[3];
					req.collection = req.db.collection(match[3]);
				}
			}
		}

		res.locals.path = req.path;

		if(req.path === 'login' || (req.method === 'post' && req.path.indexOf('import') !== 1))
			return next();

		req.mongoMng.listDbs()
			.then(dbs => res.locals.dbs = dbs)
			.then(() => next())
			.catch(next);
	};
};