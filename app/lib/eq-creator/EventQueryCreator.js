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
		switch(element.type || element.$type) {
			case "eqmn:OutputEvent":
				if(element.incoming.length == 0) {
					console.error("VALIDATING ERROR: output event must be the target of a sequence");
					return false;
				}
				output++;
				break;
			case "eqmn:InputEvent":
				var name = element.businessObject ? element.bussinessObject.name : element.name;
				if(!name || name == "") {
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
				if(!element.text || element.text == "") {
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
				if(!element.name || element.name == "") {
					console.error("VALIDATING ERROR: interval needs a label specifying the time");
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

// TODO: alles zum Model in eizelnes Javascript
function getModel() {
	var model = window.bpmnjs.getEqmnElements();
	if(!validateModel(model)) {
		return null;
	}
	// store ids of already processed input events to handle them only once
	var queryModel = {}, element, processed = [], children, child;
	for(var i=0; i<model.length; i++) {
		if(isConnection(model[i]) || !isUnprocessed(model[i], processed)) {
			continue;
		}
		element = getStartElement(model[i]);
		switch(element.type) {
			case "eqmn:OutputEvent": 									
				queryModel.output = getOutputProperties(element);
				break;
			case "eqmn:Window":											
				queryModel.input = getWindowProperties(element, 'default', processed);
				break;
			case "eqmn:TimeWindow":
				queryModel.input = getWindowProperties(element, 'time', processed);
				break;
			case "eqmn:SlidingTimeWindow":
				queryModel.input = getWindowProperties(element, 'sliding_time', processed);
				break;
			case "eqmn:SlidingBatchTimeWindow":
				queryModel.input = getWindowProperties(element, 'sliding_batch_time', processed);
				break;
			case "eqmn:LengthWindow":
				queryModel.input = getWindowProperties(element, 'length', processed);
				break;
			case "eqmn:SlidingLengthWindow":
				queryModel.input = getWindowProperties(element, 'sliding_length', processed);
				break;
			case "eqmn:SlidingBatchLengthWindow":
				queryModel.input = getWindowProperties(element, 'sliding_batch_length', processed);
				break;
			case "eqmn:Interval":
				queryModel.input = getIntervalProperties(element, processed);
				break;
			case "eqmn:ConjunctionOperator":
			case "eqmn:DisjunctionOperator":
			case "eqmn:NegationOperator":
				if(isUnprocessed(element, processed)) {
					queryModel.input = getComplexInputProperties(element, processed);
				}
				break;
			case "eqmn:InputEvent":							
				if(isUnprocessed(element, processed)) {
					if(isSingleInputEvent(element)) {
						queryModel.input = getInputProperties(element, processed);
					} else {
						// sequence
						var first = getFirstElementOfSequence(element);
						queryModel.input = getSequence(first, processed);
					}
				}
				break;
		}
	}
	return queryModel;
}

function isConnection(element) {
	if(element.type == "bpmn:Association" ||
	   element.type == "eqmn:Sequence" ||
	   element.type == "eqmn:LooseSequence") {
		return true;
	}
	return false;
}

function getStartElement(element) {
	var start = element;
	while(!isLastElement(start)) {
		start = getNextElement(start);
	}
	return getParentWindowIfAvailable(start);
}

function getParentWindowIfAvailable(element) {
	if(!element.parent) {
		return element;
	}
	var parent = element.parent;
	if(parent.type.indexOf("Window") != -1 || parent.type == "eqmn:Interval") {
		return parent;
	}
	return element;
}

function getSequence(element, processed) {
	var properties = {};
	properties.sequence = getNextSequence(element, processed);
	element = getNextElementInSequence(element);
	return properties;
}

function getNextSequence(element, processed) {
	var properties = {};
	var next = getNextElementInSequence(element);
	properties.type = (next.incoming[0].type == "eqmn:LooseSequence") ? 'loose' : 'strict';
	properties.start = getInputProperties(element, processed);
	if(isLastElementInSequence(next)) {
		properties.end = getInputProperties(next, processed);
	} else {
		properties.end = getNextSequence(next, processed);
	}
	return properties;
}

function getNextElementInSequence(element) {
	var target;
	for(var i=0; i<element.outgoing.length; i++) {
		target = element.outgoing[i].target;
		if(target.type == "eqmn:InputEvent") {
			return target;
		}
	}	
}

function getNextElement(element) {
	var target;
	for(var i=0; i<element.outgoing.length; i++) {
		target = element.outgoing[i].target;
		if(target.type != "eqmn:OutputEvent" && target.type != "bpmn:TextAnnotation") {
			return target;
		}
	}	
}

function isLastElement(element) {
	if(element.outgoing.length == 0 && element.type != "eqmn:OutputEvent") {
		return true;
	}
	var target;
	for(var i=0; i<element.outgoing.length; i++) {
		target = element.outgoing[i].target;
		if(target.type != "eqmn:OutputEvent" && target.type != "bpmn:TextAnnotation") {
			return false;
		}
	}
	return true;
}

function isLastElementInSequence(element) {
	if(element.outgoing.length == 0) {
		return true;
	}
	var target;
	for(var i=0; i<element.outgoing.length; i++) {
		target = element.outgoing[i].target;
		if(target.type == "eqmn:InputEvent") {
			return false;
		}
	}
	return true;
}

function getFirstElementOfSequence(element) {
	var first = element;
	while(first.incoming.length > 0) {
		first = first.incoming[0].source;
	}
	return first;
}

function isSingleInputEvent(element) {
	if(element.incoming.length != 0) {
		return false;
	}
	if(element.outgoing.length == 0) {
		return true;
	}
	var element;
	for(var i=0; i<element.outgoing.length; i++) {
		element = element.outgoing[i].target;
		if(element.type != "bpmn:TextAnnotation" && element.type != "eqmn:OutputEvent") {
			return false;
		}
	}
	return true;
}

function isUnprocessed(element, processed) {
	if (processed.indexOf(element.id) > -1) {
		return false;
	}
	return true;
}

function getRootElement(elements, processed) {
	// only one element? (= no array) --> root element
	if(!elements.length) return elements;
	
	// look for element that has NO outgoing connection
	var element;
	for(var i=0; i<elements.length; i++) {
		element = elements[i];
		if(element.outgoing.length == 0 && !isConnection(element)) {
			return element;
		}
	}
}

function getIntervalProperties(element, processed) {
	var properties = {};
	properties.interval = {};
	properties.interval.value = element.name;
	properties.interval.pattern = getComplexInputProperties(element.children, processed);
	processed.push(element.id);
	return properties;
}

function getIncomingPattern(rootElement, processed) {
	var properties = {};
	switch(rootElement.type) {
		case "eqmn:ConjunctionOperator":
			properties.conjunction = [];
			var element;
			for(var i=0; i<rootElement.incoming.length; i++) {
				element = rootElement.incoming[i].source;
				properties.conjunction.push(getIncomingPattern(element, processed));
			}
			processed.push(rootElement.id);
			break;
		case "eqmn:DisjunctionOperator":
			properties.disjunction = [];
			var element;
			for(var i=0; i<rootElement.incoming.length; i++) {
				element = rootElement.incoming[i].source;
				properties.disjunction.push(getIncomingPattern(element, processed));
			}
			processed.push(rootElement.id);
			break;
		case "eqmn:NegationOperator":
			properties.negation = getIncomingPattern(rootElement.incoming[0].source, processed);	// only one incoming for NegationOperator allowed
			processed.push(rootElement.id);
			break;
		case "eqmn:InputEvent":
			if(rootElement.incoming.length > 0) {
				// end of sequence
				var first = getFirstElementOfSequence(rootElement);
				properties = getSequence(first, processed);
			} else {
				// single input event
				properties = getInputProperties(rootElement, processed);
			}
			
			break;
	}
	return properties;
}

function getComplexInputProperties(elements, processed) {
	var rootElement = getRootElement(elements, processed); 	// get upmost element like root of tree
	// walk down the tree and look for connected elements (depth-first)
	return getIncomingPattern(rootElement, processed);
}

function getInputProperties(element, processed) {
	var properties = {}, connection;
	properties.name = element.name || element.businessObject.name;		// type
	if(element.outgoing.length > 0) {								
		for(var i=0; i<element.outgoing.length; i++) {
			connection = element.outgoing[i];
			if(connection.type == "bpmn:Association") {					// condition
				properties.condition = connection.target.businessObject.text;
				break;
			}				
		}
	}
	processed.push(element.id);
	return properties;
}

function getOutputProperties(element) {
	var properties = {};
	properties.name = element.name;										// type
	if(element.outgoing.length > 0) {									// condition
		properties.select = element.outgoing[0].target.businessObject.text; 	
	}
	return properties;
}


function getWindowProperties(element, type, processed) {
	var properties = {}, child;
	properties.window = {};
	var children = element.children;
	properties.window.event = {};
	for(var j=0; j<children.length; j++) {
		child = children[j];					
		if(child.type == "eqmn:InputEvent") {				// event type
			properties.window.event.name = child.name || child.businessObject.name;	
			processed.push(child.id);
		} else if(child.type == "bpmn:TextAnnotation") {	// event condition
			properties.window.event.condition = child.businessObject.text;
		}
	}	
	properties.window.type = type;							// type [default, time, time_sliding, ...]
	if(type != 'default') {									
		properties.window.value = element.name;				// value (length/time)
	}
	return properties;
}

function createEsperQuery() {
	console.log("create ESPER query");
}


