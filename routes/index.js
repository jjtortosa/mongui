/* global module */

var express = require('express')
,	router = express.Router({strict: true})
,	db = require('./db')
,	multipart = require('connect-multiparty')
,	multipartMiddleware = multipart();

/* GET home page. */
router.get('/', require('./home'));

/* ajax */
router.get('/db/:db/:collection/:id/:field', require('./field'));
router.all('/createdb', require('./createdb'));

/* html */
router.all('/command', require('./command'));
router.get('/dbs', require('./dbs'));
router.get('/db/:db', db);
router.post('/db/:db', require('./dbpost'));
router.post('/import/:db', multipartMiddleware, require('./import'));
router.get('/db/:db/:collection', db);
router.get('/db/:db/:collection/:op', db);
router.get('/db/:db/:collection/:op/:msg', db);
router.post('/db/:db/:collection', require('./colpost'));
router.post('/db/:db/:collection/:op', require('./colpost'));

router.all('/login', require('./login'));
router.all('/logout', require('./logout'));

router.get('/readme', require('./readme.md'));

router.get('/:sec', function(req, res, next){
	try{
		require('./' + req.params.sec)(req, res, next);
	} catch(e){
		next();
	}
});

module.exports = router;
