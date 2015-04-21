/* global module, __dirname */

var fs = require('fs')
,	path = require('path')
,	md = require('marked');

module.exports = function(req, res, next){
	fs.readFile(path.join(__dirname, '../Readme.md'), function(err, data){
		if(err)
			return next(err);

		res.render('readme', {content: md(data.toString())});
	});
};