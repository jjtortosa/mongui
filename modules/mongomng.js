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

	dbsInfo(cb) {
		var self = this;

		this.listDbs(function (err, databases) {
			if (err || !databases.length)
				return cb.call(self, err, databases);

			var count = 0;

			databases.forEach(function (db) {
				self.useDb(db.name).stats(function (err, stats) {
					for (var i in stats)
						db[i] = stats[i];

					['storageSize', 'dataSize', 'indexSize', ''].forEach(function (k) {
						db[k] = human(db[k]);
					});

					db.ok = db.ok && '✓';

					if (++count === databases.length) {
						cb.call(self, null, databases);
					}
				});
			});
		});
	}

	useDb(n) {
		return this.db.db(n);
	}

	admin() {
		return this.db.admin();
	}

	listDbs(cb) {
		var self = this
			, count = 0;

		this.admin().listDatabases(function (err, result) {
			if (err)
				return cb.call(self, err);

			result.databases.forEach(function (db) {
				db.sizeOnDisk = human(db.sizeOnDisk);

				self.useDb(db.name).listCollections().toArray(function (err, collections) {
					db.collections = collections.length;

					if (++count === result.databases.length)
						cb.call(self, null, result.databases);
				});
			});

			result.databases.sort(function (a, b) {
				return a.name > b.name ? 1 : -1;
			});
		});
	}

	getCollections(db, cb) {
		var self = this
			, collections = [];

		this.useDb(db).collections(function (err, r) {
			if (err)
				return cb.call(self, err);

			if (!r.length)
				return cb.call(self);

			var count = 0;

			r.forEach(function (c) {
				c.count(function (err, t) {
					collections.push({name: c.collectionName, count: t});

					if (++count === r.length) {
						collections.sort(function (a, b) {
							return a.name > b.name ? 1 : -1;
						});

						cb.call(self, null, collections);
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
}

module.exports = function(app){
	var conf = app.get('conf')
	,	uri = 'mongodb://' + (conf.host || 'localhost');

	MongoClient.connect(uri, function(err, db){
		if(err)
			return console.error(err);

		var mongoMng = new MongoMng(db);

		app.set('mongoMng', mongoMng);

		console.info('MongoDb - Connected');

		app.emit('dbconnected');
	});

	return function(req, res, next){
		req.mongoMng = app.get('mongoMng');

		var match = decodeURI(req.path).match(/^\/(db|import)\/([^\/]+)\/?([^\/]*)/);

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

		req.mongoMng.listDbs(function(err, dbs){
			if(err)
				return next(err);

			res.locals.dbs = dbs;

			next(err);
		});
	};
};

function human(n){
	var gb = 1024*1024*1024,
		mb = 1024*1024,
		kb = 1024;

	if(n > gb)
		return (n/gb).toFixed(2)+' Gb';

	if(n > mb)
		return (n/mb).toFixed(2)+' Mb';

	if(n > kb)
		return (n/kb).toFixed(2)+' Kb';

	return n + ' b';
}