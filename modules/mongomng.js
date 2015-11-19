/* global require, module, decodeURI */

var MongoClient = require('mongodb').MongoClient
,	ObjectId = require('mongodb').ObjectID
,	events = require('events')
,	debug = require('debug')('mongui:server')
,	assert = require('assert');

function MongoMng(db) {
	this.db = db;
}

MongoMng.prototype.__proto__ = events.EventEmitter.prototype;

MongoMng.prototype.dbsInfo = function(cb){
	var self = this;

	this.listDbs(function(err, databases){
		if(err || !databases.length)
			return cb.call(self, err, databases);

		var count = 0;

		databases.forEach(function(db){
			self.useDb(db.name).stats(function(err, stats){
				for(var i in stats)
					db[i] = stats[i];

				['storageSize', 'dataSize', 'indexSize', ''].forEach(function(k){
					db[k] = human(db[k]);
				});

				db.ok = db.ok && '&#10003;';

				if(++count === databases.length){
					cb.call(self, null, databases);
				}
			});
		});
	});
};

MongoMng.prototype.useDb = function(n){
	return this.db.db(n);
};

MongoMng.prototype.admin = function(){
	return this.db.admin();
};

MongoMng.prototype.listDbs = function(cb){
	var self = this
	,	count = 0;

	this.admin().listDatabases(function(err, result){
		if(err)
			return cb.call(self, err);

		result.databases.forEach(function(db){
			db.sizeOnDisk = human(db.sizeOnDisk);
			
			self.useDb(db.name).listCollections().toArray(function(err, collections){
				db.collections = collections.length;

				if(++count === result.databases.length)
					cb.call(self, null, result.databases);
			});
		});

		result.databases.sort(function(a,b){
			return a.name > b.name ? 1 : -1;
		});
	});
};

MongoMng.prototype.getCollections = function(db, cb){
	var self = this
	,	collections = [];

	this.useDb(db).collections(function(err, r){
		if(err)
			return cb.call(self, err);

		if(!r.length)
			return cb.call(self);

		var count = 0;

		r.forEach(function(c){
			c.count(function(err, t){
				collections.push({name: c.collectionName, count: t});

				if(++count === r.length){
					collections.sort(function(a,b){
						return a.name > b.name ? 1 : -1;
					});

					cb.call(self, null, collections);
				}
			});
		});
	});
};

MongoMng.prototype.serverInfo = function(cb){
	var self = this
	,	admin = this.admin();

    admin.profilingLevel(function(err, level){
		if(err) return cb.call(self, err);

        admin.serverInfo(function(err, info){
			if(err) return cb.call(self, err);

			admin.command({getCmdLineOpts: 1}, function(err, opt){
				if(err) return cb.call(self, err);
				
				var p = opt.parsed;
				
				var cmd = {
					argv: opt.argv.join(' '),
					config: p.config,
					net: JSON.stringify(p.net),
					dbPath: p.storage.dbPath,
					log: p.systemLog.path
				};
				
				cb.call(self, null, {
					info: info,
					level: level,
					cmd: cmd
				});
			});
        });
    });
};

MongoMng.prototype.serverStatus = function(cb){
	this.admin().serverStatus(cb);
};

MongoMng.prototype.currentOp = function(q, cb){
	var self = this;

	if(q === true)
		q = {$all: 1};

	this.db.collection('$cmd.sys.inprog').findOne(q, function(err, data){
		cb.call(self, err, data && data.inprog);
	});
};

MongoMng.prototype.parseId = function(id){
	return MongoMng.parseId(id);
};

MongoMng.parseId = function(id){
	return ObjectId.isValid(id) ? ObjectId(id) : id;
};


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