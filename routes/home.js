/* global module */

"use strict";

module.exports = function(req, res, next){
	if(req.useMobile)
		return res.render('mobile/dbs');

	req.mongoMng
		.serverInfo()
		.then(info => {
			Object.keys(info.info).forEach(k => {
				if(typeof info.info[k] === 'object') {
					if (Array.isArray(info.info[k]))
						info.info[k] = info.info[k].join(', ');
					else
						info.info[k] = JSON.stringify(info.info[k], null, '\t');
				}
			});

			res.render('server-info', info);
		})
		.catch(next);
};
