'use strict'

//var getNextAbbreviation = require('./EventQueryCreator').getNextAbbreviation;

/**
 * this file contains only functions relevant for creation of drools queries
 */

var usedAbbreviations, abbr;

module.exports.createDroolsQuery = function(model) {
	usedAbbreviations = {};
	abbr = null;
	
	var query = {};
	var subquery = "";
	
	/* RULE */
	query.rule = "RULE '...'";
	
	/* WHEN */
	query.when = "WHEN";
	
	// (a) single input event
	if(model.input.name) {
		if(model.input.selection) {
			subquery += model.input.name + ".std:" + model.input.selection + "event() as ";
		} else {
			subquery += getPatternBinding(model.input.name) + " : " + model.input.name + "(";
			if(model.input.condition) {
				subquery += replaceEventTypes(model.input.condition);
				if(model.output.select) {
					subquery += ", ";
				}
			}
			/* SELECT */
			if(model.output.select) {
				var selects = getSingleSelects(model.output.select);
				for(var i=0; i<selects.length; i++) {
					subquery += getPatternBinding(selects[i].value) + ":" + selects[i].value.split(".")[1];
					if(i != selects.length-1) {
						subquery += ", ";
					}
				}
			}
			subquery += ")";
		}
	}
	query.when1 = subquery;
	
	/* THEN */
	query.then = "THEN";
	if(model.output.name) {
		var variable = model.output.name.toLowerCase().charAt(0);
		query.then1 = model.output.name + " " + variable + " = new " + model.output.name + "();";
		var n = 2;
		if(model.output.select) {
			var selects = getSingleSelects(model.output.select);
			var select;
			for(var i=0; i<selects.length; i++) {
				select = selects[i];
				query["then"+n] = variable + ".set" + select.as.capitalize() + "(" + getPatternBinding(selects[i].value) + ");";
				n++;
			}
		}
		query["then"+n] = "\t insert(" + variable + ");";
	} else {
		query.then1 = "// do something with selected variables";
	}
	
	query.end = "END";
	
	return query;
}

function getSingleSelects(select) {
	var result = [];
	var selects = select.split(",");
	var value, as;
	for(var i=0; i<selects.length; i++) {
		value = selects[i].trim().match(new RegExp("[A-Za-z]+\\.[A-Za-z]+(\\s)+(AS|as)"))[0].match(/\S+/g)[0];
		as = selects[i].trim().match(new RegExp("(AS|as)(\\s)+[A-Za-z]+"))[0].match(/\S+/g)[1];
		result.push({
			"value": value,
			"as": as
		});
	}
	return result;
}

function getPatternBinding(type) {
	var a;
	if(!usedAbbreviations[type]) {
		a = "$" + getNextAbbreviation();
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
	// DROOLS uses == instead of =
	return string.replace(new RegExp("=+"), "==");
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

String.prototype.capitalize = function() {
    return this.replace(/^./, this[0].toUpperCase());
}

String.prototype.replaceAll = function(from, to) {
	return this.replace(new RegExp(from, "g"), to);
};