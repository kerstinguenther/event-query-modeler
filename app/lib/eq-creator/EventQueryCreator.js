'use strict'

var getModel = require('./EventQueryModeler').getModel;

module.exports.createQuery = function(language) {
	var model = getModel();
	if(model.errorMessage) {
		return model;
	}
	var query;
	switch(language) {
	case 'ESPER': 
		query = createEsperQuery(model);
		break;
	default:
		console.error(language + " is not a supported query language")
	}
	return query;
};

function createEsperQuery(model) {
	var query = {};
	var subquery = "";
	
	/* INSERT INTO */
	if(model.output.name) {
		subquery += "INSERT INTO " + model.output.name;
		query.insertInto = subquery;
	}
	
	/* SELECT */
	subquery = "SELECT ";
	if(model.output.select) {
		subquery += model.output.select;
	} else {
		subquery += "*"
	}
	query.select = subquery;
	
	/* FROM */
	subquery = "FROM ";
	
	// (a) single input event
	if(model.input.name) {
		if(model.input.selection) {
			subquery += model.input.name + ".std:" + model.input.selection + "event(";
		} else {
			subquery += model.input.name + "(";
			if(model.input.condition) {
				subquery += model.input.condition;
			}
		}
		subquery += ")";
	}
	
	// (b) window
	else if(model.input.window) {
		subquery += model.input.window.event.name + ".win:";
		switch(model.input.window.type) {
			case "default":
				subquery += "keepall()";
				break;
			case "time":
				subquery += "firsttime(" + model.input.window.value + ")";
				break;
			case "length":
				subquery += "firstlength(" + model.input.window.value + ")";
				break;
			case "time_sliding":
				subquery += "time(" + model.input.window.value + ")";
				break;
			case "length_sliding":
				subquery += "length(" + model.input.window.value + ")";
				break;
			case "time_sliding_batch":
				subquery += "time_batch(" + model.input.window.value + ")";
				break;
			case "length_sliding_batch":
				subquery += "length_batch(" + model.input.window.value + ")";
				break;
		}
	}
	
	// (c) interval
	else if(model.input.interval) {
		subquery += "PATTERN [ ";
		subquery += getEsperPattern(model.input.interval.pattern);
		subquery += " AND timer:interval(" + model.input.interval.value + ")]";
	}
	
	// (d) pattern
	else {
		subquery += "PATTERN [ ";
		subquery += getEsperPattern(model.input);
		subquery += " ]";
	}
	
	subquery += ";";
	query.from = subquery;
	
	/* WHERE */
	if(model.condition) {
		subquery = "WHERE " + model.condition + ";";
		query.where = subquery;
		query.from = query.from.replace(";", "");
	}
	
	return query;
}

function getEsperPattern(model) {
	var pattern = "";
	
	if(model.sequence) {
		// NOTE: 'strict' and 'loose' sequences are tranformed to 'loose' sequences
		// because no possibility to define strict sequence in complex pattern
		// can only be used in simple sequence..
		// TODO: eventuell unter/über Abfrage angeben, dass strikte Sequenz nicht transformiert werden konnte
		// TODO: (nur wenn strikte Sequenz vorkommt)
		pattern += "(" + getEsperInputEvent(model.sequence.start);
		pattern += " -> ";
		pattern += getEsperPattern(model.sequence.end) + ")";
	} else if(model.conjunction) {
		pattern += "(";
		for(var i=0; i<model.conjunction.length; i++) {
			pattern += getEsperPattern(model.conjunction[i]);
			if(i < model.conjunction.length-1) {
				pattern += " AND ";
			}
		}
		pattern += ")";
	} else if(model.disjunction) {
		pattern += "(";
		for(var i=0; i<model.disjunction.length; i++) {
			pattern += getEsperPattern(model.disjunction[i]);
			if(i < model.disjunction.length-1) {
				pattern += " OR ";
			}
		}
		pattern += ")";
	} else if(model.negation) {
		pattern += "NOT ";
		pattern += getEsperPattern(model.negation);
	} else {
		pattern += getEsperInputEvent(model);
	}
	
	return pattern;
}

function getEsperInputEvent(element) {
	var input = "";
	input += element.name;
	if(element.selecting) {
		input += ".std:" + element.selecting + "event()";
	} else {
		if(element.condition) {
			input += "(" + element.condition + ")";
		}
	}
	return input;
}

function hasNextPatternElement(pattern) {
	if(pattern.sequence || pattern.conjunction || pattern.disjunction || pattern.negation) {
		return true;
	}
	return false;
}
