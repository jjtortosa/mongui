var express = require('express')
	, router = express.Router()
	, db = require('./db');

/* GET home page. */
router.get('/', require('./dbs'));

router.get('/db/:db', db);
router.post('/db/:db', require('./dbpost'));
router.get('/db/:db/:collection', db);
router.post('/db/:db/:collection', require('./colpost'));

/* ajax */
router.get('/db/:db/:collection/:id/:field', require('./field'));
router.post('/createdb', require('./createdb'));
//router.post('/db/:db/:collection/post', require('./post'));

router.all('/login', require('./login'));

router.get('/:sec', function(req, res, next){
	try{
		require('./' + req.param('sec'))(req, res, next);
	} catch(e){
		next();
	}
});

module.exports = router;
