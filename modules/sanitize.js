"use strict";

const Entities = require('html-entities').AllHtmlEntities;

function sanitize(obj, indent, parent){
	indent = indent || '';

	if(obj === null)
		return {type: 'null', html: null};

	if(Array.isArray(obj))
		return {type: 'array', html: sanitizeArray(obj, indent, parent)};

	if(typeof obj === 'string')
		return {type: 'string', html: '"' + sanitizeString(obj, parent) + '"'};

	switch (obj.constructor.name) {
		case 'ObjectID':
			return {type: 'mixed', html: 'ObjectId("' + obj + '")'};

		case 'Date':
			return {type: 'mixed', html: isNaN(obj) ? obj.toString() : 'ISODate("' + obj.toISOString() + '")'};

		case 'Binary':
			return {type: 'binary', html: '"&lt;Mongo Binary Data&gt;"'};

		case 'DBRef':
			const dbref = {
				$ref: obj.namespace,
				$id: obj.oid
			};

			if (obj.db)
				dbref.$db = obj.db;

			return {type: 'mixed', html: sanitizeObj(dbref, indent, parent)};

		case 'RegExp':
			return {type: 'mixed', html: obj};

		default:
			if (typeof obj === 'object')
				return {type: 'mixed', html: sanitizeObj(obj, indent, parent)};

			return {type: 'mixed', html: obj.toString()};
	}
}

function sanitizeObj(obj, indent, parent, removeBrackets){
	let ret = removeBrackets ? '' : '{\n';
	const nb = indent + (removeBrackets ? '' : '\t'),
		keys = Object.keys(obj),
		newParent = (parent ? parent + '.' : '');

	keys.forEach((k, i) => {
		const s = sanitize(obj[k], nb, newParent + k);

		ret += nb + '<a class="r-key"';

		if(parent)
			ret += ' data-parent="' + parent + '"';

		ret += ' href="#" data-type="' + s.type + '">' + k + '</a>: <span>' + s.html + '</span>';

		if(i < keys.length - 1)
			ret += ',';

		ret += '\n';
	});

	if(!removeBrackets)
		ret += indent + '}';

	return ret;
}

function sanitizeArray(arr, indent, parent){
	const nb = indent + '\t',
		tmp = [];

	arr.forEach((a, i) => {
		tmp.push(nb + sanitize(a, nb, parent + '.' + i).html);
	});

	return '[\n' + tmp.join(',\n') + '\n' + indent + ']';
}

function sanitizePlainObj(obj){
	for(let k in obj){
		switch(typeof obj[k]){
			case 'number':
				if(obj[k] < 1024)
					break;

				if(obj[k] < 1024*1024){
					obj[k] = (obj[k]/1024).toFixed(2) + 'Kb';
					break;
				}

				obj[k] = (obj[k]/(1024*1024)).toFixed(2) + 'Mb';

				break;
			case 'object':
				obj[k] = JSON.stringify(obj[k]);
		}
	}

	return obj;
}

function sanitizeString(s, parent){
	const ent = new Entities();
	let ret = ent.encode(s);

	if(ret.length > 240)
		ret = ret.substr(0, 240) + ' <a href="' + parent + '" class="moretext">[...]</a>';

	return ret;
}

module.exports = {
	any: sanitize,
	obj: sanitizeObj,
	array: sanitizeArray,
	plainObj: sanitizePlainObj,
	string: sanitizeString
};