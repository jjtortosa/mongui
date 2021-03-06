"use strict";

const mongodump = require('../modules/mongodump');

module.exports = function(req, res, next){
	switch(req.body.op){
		case 'dropdb':
			req.db.dropDatabase(() => req.res.redirect('/'));
			break;

		case 'repair':
			req.db.command({repairDatabase: 1}, function(err, r){
				res.locals.result = err || r;
				res.send(err || r);
			});

			break;

		case 'createCollection':
			const dbpath = '/db/' + res.locals.dbname;

			if(!req.body.colname)
				return res.redirect(dbpath + '?op=newcollection');

			req.db.createCollection(req.body.colname, function(){
				res.redirect(dbpath + '/' + req.body.colname);
			});
			break;

		case 'export':
			mongodump(req.params.db, JSON.parse(req.body.collections), req.app.get('conf'))
				.then(file => res.download(file))
				.catch(next);
			break;

		case 'adduser':
			let roles = req.body.roles;

			if(typeof roles === 'string')
				roles = [roles];

			req.db.addUser(req.body.username, req.body.password, {roles: roles}, function(err){
				res.redirect(err ? req.path + '?op=add-user&username=' + req.body.username + '&err=' + err.message : '?op=auth');
			});
			break;

		case 'removeUser':
			req.db.removeUser(req.body.user, function(err, result){
				if(err)
					return res.json({error: err.message});

				res.send(result);
			});
			break;

		case 'dup':
			const name = req.body.name.trim();

			let dupErr = err => res.redirect('?op=dup&name=' + name + '&err=' + err);

			if(!name)
				return dupErr('');

			if(res.locals.dbs.some(function(db){
				return db.name === name;
			}))
				return dupErr('Database "' + name + '" already exists');

			req.mongoMng.admin().command({
				copydb: 1,
				fromdb: req.db.databaseName,
				todb: name
			}, function(err){
				if(err)
					return dupErr(err);

				res.redirect('/db/' + name)
			});

			break;

		default:
			next();
	}
};
