/* global module */

module.exports = function setup(req,res,next){
	req.useMobile = req.app.get('conf').useMobile.indexOf(req.device.type) !== -1;
	
	next();
};