var MongoClient = require('mongodb').MongoClient
,	events = require('events')
,	assert = require('assert');

function MongoMng(db) {
	this.db = db;
}

MongoMng.prototype.__proto__ = events.EventEmitter.prototype;

MongoMng.prototype.dbsInfo = function(cb){
	var self = this;
	
	this.listDbs(function(err, databases){
		if(err)
			return cb.call(self, err);
		
		var count = 0;
		
		databases.forEach(function(db){
			self.useDb(db.name).stats(function(err, stats){
				for(var i in stats)
					db[i] = stats[i];
				
				['sizeOnDisk', 'storageSize', 'dataSize', 'indexSize', ''].forEach(function(k){
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
	var self = this;
	
	this.admin().listDatabases(function(err, result){
		if(err)
			return cb.call(self, err);
		
		result.databases.sort(function(a,b){
			return a.name > b.name ? 1 : -1;
		});
		
		cb.call(self, null, result.databases);
	});
};

MongoMng.prototype.serverInfo = function(cb){
	var self = this
	,	admin = this.admin();
	
	admin.replSetGetStatus(function(err, level){
		if(err) return cb.call(self, err);
		
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


module.exports = function(req, res, next){
	res.locals.reqpath = req.path;
	
	var conf = req.app.get('conf')
	,	uri = 'mongodb://';

	if(conf.mongouser && conf.mongopass)
		uri += conf.mongouser + ':' + conf.mongopass + '@';

	var match = req.path.match(/^\/db\/([^\/]+)/)
	,	dbname = match && match[1];
	
	uri += (conf.host || 'localhost') + (dbname ? '/' + dbname : '');
	
	MongoClient.connect(uri, function(err, db){
		if(err)
			return next(err);
		
		req.mongoMng = new MongoMng(db);
		
		console.info('MongoDb - Connected' + (dbname ? ' to db "' + dbname + '"' : ''))	;
		
		next();
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