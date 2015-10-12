'use strict'

var getModel = require('./EventQueryModeler').getModel;

module.exports.createQuery = function(language) {
	var model = getModel();
	switch(language) {
	case 'ESPER': 
		createEsperQuery();
		break;
	default:
		console.error(language + " is not a supported query language")
	}
	return model;
};

function createEsperQuery() {
	console.log("create ESPER query");
}


