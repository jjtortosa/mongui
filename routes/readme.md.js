"use strict";

const fs = require('fs');
const path = require('path');
const md = require('marked');

module.exports = function(req, res, next){
	fs.readFile(path.join(__dirname, '../Readme.md'), function(err, data){
		if(err)
			return next(err);

		res.render('readme', {content: md(data.toString())});
	});
};