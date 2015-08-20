function SearchString(a){
	if(!(this instanceof SearchString))
		return new SearchString(a);
	
	this.string = a || location.search;
	this.parse();
}

SearchString.prototype.add = function(key, val){
	this.obj[key] = val;
};

SearchString.prototype.remove = function(key){
	delete this.obj[key];
};

SearchString.prototype.go = function(){
	location.search = this.toString();
};

SearchString.prototype.toString = function(){
	var ret = '?';
	
	for(var k in this.obj)
		ret += k + '=' + this.obj[k];
	
	return ret;
};

SearchString.prototype.parse = function(){
	var self = this;
	
	this.obj = {};
	
	this.string.substr(1).split('&').forEach(function(pair){
		var s = pair.split('=');
		
		self.obj[s[0]] = s[1];
	});
	
	return this.obj;
};