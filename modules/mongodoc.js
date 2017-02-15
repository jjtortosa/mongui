"use strict";

class MongoDoc {
	constructor(val) {
		this.val = val;

		this.type = this.getType();
		this.inputType = this.getInputType();
	}

	getType() {
		if (this.val === null)
			return 'null';

		if (Array.isArray(this.val))
			return 'array';

		if (this.val && this.val.constructor) {
			if (this.val.constructor.name === 'ObjectID')
				return 'ObjectID';

			if (this.val.constructor.name === 'Date')
				return 'Date';

			if (this.val.constructor.name === 'Binary')
				return 'Binary';

			if (this.val.constructor.name === 'DBRef')
				return 'DBRef';
		}

		return typeof this.val;
	}

	getInputType() {
		switch (this.type) {
			case 'Binary':
				return 'binary';
			case 'number':
			case 'null':
			case 'boolean':
			case 'string':
				return this.type;
			case 'ObjectID':
			case 'Date':
			case 'DBRef':
			case 'array':
			default:
				return 'mixed';
		}
	}

	val4edit() {
		switch (this.type) {
			case 'ObjectID':
				return 'ObjectId("' + this.val + '")';

			case 'Date':
				return 'ISODate("' + this.val.toISOString() + '")';

			case 'DBRef':
				const ref = this.val.toJSON();

				ref.$id = 'ObjectId("' + ref.$id + '")';

				const ret = JSON.stringify(ref, null, '\t');

				return ret.replace(/"(ObjectId\()\\("[^\\]+)\\"\)"/g, '$1$2")');
			case 'Binary':
				return this.val.toString('hex');
		}

		switch (this.inputType) {
			case 'mixed':
				return JSON.stringify(this.val, null, '\t');
		}

		return this.val;
	}

	toSend() {
		return {
			val: this.val4edit(),
			type: this.type,
			inputType: this.inputType
		};
	}
}

module.exports = MongoDoc;

global.ISODate = a => new Date(a);

RegExp.prototype.toJSON = function(){return this.toString()};