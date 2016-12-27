const express = require('express');
const router = express.Router({strict: true});
const db = require('./db');
const multipart = require('connect-multiparty');
const multipartMiddleware = multipart();

/* GET home page. */
router.get('/', require('./home'));

/* ajax */
router.get('/db/:db/:collection/:id/:field', require('./field'));
router.all('/createdb', require('./createdb'));

/* html */
router.all('/command', require('./command'));
router.get('/dbs', require('./dbs'));

router.route('/db/:db')
	.get(db)
	.post(require('./dbpost'));

router.post('/import/:db', multipartMiddleware, require('./import'));

router.route('/db/:db/:collection')
	.get(db)
	.post(require('./colpost'));

router.route('/db/:db/:collection/:op')
	.get(db)
	.post(require('./colpost'));

router.get('/db/:db/:collection/:op/:msg', db);

router.all('/login', require('./login'));
router.all('/logout', require('./logout'));

router.get('/:sec', function(req, res, next){
	try{
		require('./' + req.params.sec)(req, res, next);
	} catch(e){
		next();
	}
});

router.post('/ajax/:op', require('./ajax'));

module.exports = router;
