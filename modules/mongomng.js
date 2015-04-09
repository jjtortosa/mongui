/* global require, module, decodeURI */

var MongoClient = require('mongodb').MongoClient
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
	if(this.databases)
		return cb.call(self, null, this.databases);
	
	var self = this
	,	count = 0;
	
	this.admin().listDatabases(function(err, result){
		if(err)
			return cb.call(self, err);
		
		result.databases.forEach(function(db){
			db.sizeOnDisk = human(db.sizeOnDisk);
			
			self.useDb(db.name).collectionNames(function(err, collections){
				db.collections = collections.length;
				
				if(++count === result.databases.length)
					cb.call(self, null, self.databases);
			});
		});
		
		result.databases.sort(function(a,b){
			return a.name > b.name ? 1 : -1;
		});
		
		self.databases = result.databases;
	});
};

MongoMng.prototype.getCollections = function(cb){
	var self = this
	,	collections = [];
		
	this.db.collections(function(err, r){
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

            cb.call(self, null, {
                info: info,
                level: level
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

MongoMng.prototype.setCollection = function(colname, cb){
	this.collection = this.db.collection(colname);
};


module.exports = function(req, res, next){
	res.locals.reqpath = req.path;
	
	var conf = req.app.get('conf')
	,	uri = 'mongodb://';

	if(conf.mongouser && conf.mongopass)
		uri += conf.mongouser + ':' + conf.mongopass + '@';

	var match = decodeURI(req.path).match(/^\/(db|import)\/([^\/]+)\/?([^\/]*)/);

	if(match){
		res.locals.dbname = match && match[2];
		res.locals.collection = match && match[3];
	}
	
	uri += (conf.host || 'localhost') + (res.locals.dbname ? '/' + res.locals.dbname : '');

	MongoClient.connect(uri, function(err, db){
		if(err)
			return next(err);
		
		req.mongoMng = new MongoMng(db);
		
		if(res.locals.collection)
			req.mongoMng.setCollection(res.locals.collection);
		
		res.locals.path = req.path;
		
		debug('MongoDb - Connected' + (res.locals.dbname ? ' to db "' + res.locals.dbname + '"' : ''))	;
		
		if(req.path === 'login' || (req.method === 'post' && req.path.indexOf('import') !== 1))
			return next();
		
		req.mongoMng.listDbs(function(err, dbs){
			if(err)
				return next(err);

			res.locals.dbs = dbs;
			
			next(err);
		});
	});
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