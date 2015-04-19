module.exports = function(req, res){
	if(req.method === 'GET' || !req.body.command)
		return res.render('command');
	
	var command;
	
	eval('command=' + req.body.command);

	req.mongoMng.useDb(req.body.db).command(command, function(err, r){
		res.locals.result = err || r;
		res.send(err || r);
	});
};