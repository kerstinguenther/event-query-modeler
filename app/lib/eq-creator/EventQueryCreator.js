'use strict'

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

function validateModel(model) {
	var output = 0, input = false, element;
	if(model.length == 0) {
		console.error("VALIDATING ERROR: no model");
		return false;
	}
	for(var i=0; i<model.length; i++) {
		element = model[i];
		switch(element.type) {
			case "eqmn:OutputEvent":
				if(element.incoming.length == 0) {
					console.error("VALIDATING ERROR: output event must be the target of a sequence");
					return false;
				}
				output++;
				break;
			case "eqmn:InputEvent":
				if(!element.name || element.name == "") {
					console.error("VALIDATING ERROR: input event needs a label");
					return false;
				}
				if(element.parent && element.parent.type.indexOf("Window")==-1 && element.outgoing.length == 0) {
					console.error("VALIDATING ERROR: input event outside window must be the source of a sequence");
					return false;
				}
				input = true;
				break;
			case "bpmn:TextAnnotation":
				if(element.businessObject.text = "") {
					console.error("VALIDATING ERROR: conditions need a text");
					return false;
				}
				break;
			case "eqmn:Window":
			case "eqmn:TimeWindow":
			case "eqmn:LengthWindow":
			case "eqmn:SlidingTimeWindow":
			case "eqmn:SlidingLengthWindow":
			case "eqmn:SlidingBatchTimeWindow":
			case "eqmn:SlidingBatchLengthWindow":
				if(element.children.length == 0) {
					console.error("VALIDATING ERROR: window must contain an input event");
					return false;
				}
				if(element.outgoing.length == 0) {
					console.error("VALIDATING ERROR: window must be the source of a sequence");
					return false;
				}
				if(element.type != "eqmn:Window") {
					if(!element.name || element.name == "") {
						console.error("VALIDATING ERROR: time/length window needs a label specifying the time/length");
						return false;
					}
				}
				break;
			case "eqmn:Interval":
				if(element.children.length < 2) {
					console.error("VALIDATING ERROR: interval must contain at least two input events");
					return false;
				}
				if(element.outgoing.length == 0) {
					console.error("VALIDATING ERROR: interval must be the source of a sequence");
					return false;
				}
				break;
			case "eqmn:NegationOperator":
				if((element.parent && element.parent.type != "eqmn:Interval") && element.outgoing.length == 0) {
					console.error("VALIDATING ERROR: negation operator outside window/intervall must be the source of a sequence");
					return false;
				}
				if(element.incoming.length != 1) {
					console.error("VALIDATING ERROR: negation operator must be the target of only one sequence");
					return false;
				}
				break;
			case "eqmn:DisjunctionOperator":
			case "eqmn:ConjunctionOperator":
				if((element.parent && element.parent.type != "eqmn:Interval") && element.outgoing.length == 0) {
					console.error("VALIDATING ERROR: conjunction/disjunction operator outside window/intervall must be the source of a sequence");
					return false;
				}
				if(element.incoming.length < 2) {
					console.error("VALIDATING ERROR: conjunction/disjunction operator must be the target of at least two sequences");
					return false;
				}
				break;
		}
	}
	if(output==1 && input) {
		return true;
	} else {
		console.error("VALIDATING ERROR: model must have exactly one output event and at least one input event");
		return false;
	}
}

function getModel() {
	var model = window.bpmnjs.getEqmnElements();
	if(!validateModel(model)) {
		return null;
	}
	// store ids of already processed input events to handle them only once
	var queryModel = {}, element, properties, processed = [], children, child;
	for(var i=0; i<model.length; i++) {
		element = model[i];
		properties = {};
		switch(element.type) {
			case "eqmn:OutputEvent": 									// Output:
				properties.name = element.name;						// type
				if(element.outgoing.length > 0) {									// condition
					properties.select = element.outgoing[0].target.businessObject.text; 	
				}
				queryModel.output = properties;
				break;
			case "eqmn:Window":											// Input: Window
				properties.window = {};
				children = element.children;
				properties.window.event = {};
				for(var j=0; j<children.length; j++) {
					child = children[j];					
					if(child.type == "eqmn:InputEvent") {				// event type
						properties.window.event.name = child.name;	
						processed.push(child.id);
					} else if(child.type == "bpmn:TextAnnotation") {	// event condition
						properties.window.event.condition = child.businessObject.text;
					}
				}
				queryModel.input = properties;
				break;
			}
	}
	return queryModel;
}

function createEsperQuery() {
	console.log("create ESPER query");
}


