"use strict";

const {MongoClient} = require('mongodb');
const events = require('events');
const debug = require('debug')('mongui:server');
require('events').EventEmitter.defaultMaxListeners = 25;

class MongoMng extends events.EventEmitter {
	constructor(client) {
		super();

		this.client = client;
		this.db = client.db('admin');
	}

	dbsInfo() {
		return this.listDbs()
			.then(databases =>
				Promise.all(databases.map(db =>
					this.useDb(db.name).stats()
						.then(stats => {
							Object.keys(stats).forEach(key => db[key] = stats[key]);

							['storageSize', 'dataSize', 'indexSize', 'avgObjSize'].forEach(k => db[k] = MongoMng.human(db[k]));

							db.ok = db.ok && '✓';

							return db;
						})
				))
			);
	}

	useDb(n) {
		return this.client.db(n);
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

	async getCollections(db) {
		const r = await this.useDb(db).collections();
		const collections = await Promise.all(r.map(c => c.estimatedDocumentCount().then(t => ({name: c.collectionName, count: t}))));

		return collections.sort((a, b) => a.name > b.name ? 1 : -1);
	}

	serverInfo() {
		const admin = this.admin();
		const ret = {};

		return this.db.profilingLevel()
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
					log: p.systemLog.path,
					authorization: p.security ? p.security.authorization : 'disabled',
					replication: p.replication ? p.replication.replSetName : 'false'
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

		return n.toFixed(2) + ' bytes';
	}
}

module.exports = app => {
	const conf = app.get('conf');
	let uri = 'mongodb://';

	if(conf.mongouser)
		uri += conf.mongouser + ':' + conf.mongopass + '@';

	uri += (conf.host || 'localhost') + '/admin';

	MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true})
		.then(client => {
			const mongoMng = new MongoMng(client);

			app.set('mongoMng', mongoMng);

			debug('MongoDb - Connected');

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
