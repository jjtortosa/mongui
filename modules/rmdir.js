"use strict";

const fs = require('fs');
const path = require("path");

module.exports = function rmdir(dir) {
	const list = fs.readdirSync(dir);
	for(let i = 0; i < list.length; i++) {
		const filename = path.join(dir, list[i]);
		const stat = fs.statSync(filename);

		if(filename === "." || filename === "..") {
			// pass these files
		} else if(stat.isDirectory()) {
			// rmdir recursively
			rmdir(filename);
		} else {
			// rm filename
			fs.unlinkSync(filename);
		}
	}
	fs.rmdirSync(dir);
};
