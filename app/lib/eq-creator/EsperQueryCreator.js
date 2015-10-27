'use strict'

//var getNextAbbreviation = require('./EventQueryCreator').getNextAbbreviation;

/**
 * this file contains only functions relevant for creation of esper queries
 */

var usedAbbreviations, abbr;

module.exports.createEsperQuery = function(model) {
	usedAbbreviations = {};
	abbr = null;
	
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
		subquery += replaceEventTypes(model.output.select);
	} else {
		subquery += "*";
	}
	query.select = subquery;
	
	/* FROM */
	subquery = "FROM ";
	
	// (a) single input event
	if(model.input.name) {
		if(model.input.selection) {
			subquery += model.input.name + ".std:" + model.input.selection + "event() as ";
		} else {
			subquery += model.input.name;
			if(model.input.condition) {
				subquery += "(" + replaceEventTypes(model.input.condition) + ")";
			}
			subquery += " as ";
		}
		var a = getAbbrForEventType(model.input.name);
		subquery += a;
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
		var a = getAbbrForEventType(model.input.window.event.name);
		subquery += " as " + a;
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
		subquery = "WHERE " + replaceEventTypes(model.condition) + ";";
		query.where = subquery;
		query.from = query.from.replace(";", "");
	}
	
	return query;
};

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
	if(element.selecting) {
		input += element.name;
		input += ".std:" + element.selecting + "event() as ";
		input += getAbbrForEventType(element.name);
	} else {
		var a = getAbbrForEventType(element.name);
		input += a + "=";
		input += element.name;
		if(element.condition) {
			input += "(" + replaceEventTypes(element.condition) + ")";
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

function getAbbrForEventType(type) {
	var a;
	if(!usedAbbreviations[type]) {
		a = getNextAbbreviation();
		usedAbbreviations[type] = a;
	} else {
		a = usedAbbreviations[type];
	}
	return a
}

function replaceEventTypes(string) {
	var eventTypes = string.match(new RegExp("[A-Za-z]*\\.", "g"));
	if(eventTypes) {
		var type;
		// replace each event type with unique abbreviation
		for(var i=0; i<eventTypes.length; i++) {
			type = eventTypes[i].replace(".", "");
			string = string.replaceAll(type, getAbbrForEventType(type));
		}
	}
	return string;
}

function getNextAbbreviation() {
	if(!abbr) {
		abbr = 'a';
		return abbr;
	}
	if (/^z+$/.test(abbr)) {
		// all z's -> replace all with a's and add one a
		abbr = abbr.replace(/z/g, 'a') + 'a';
	} else {
		// increment last char
		abbr = abbr.slice(0, -1) + String.fromCharCode(abbr.slice(-1).charCodeAt() + 1);
	}
	return abbr;
};

String.prototype.replaceAll = function(from, to) {
	return this.replace(new RegExp(from, "g"), to);
};