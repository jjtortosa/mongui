"use strict";

module.exports = (req, res, next) => {
	req.mongoMng.dbsInfo()
		.then(dbs => res.render('dbs', {databases: dbs}))
		.catch(next);
};
