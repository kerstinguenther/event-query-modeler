'use strict'

var validateModel = require('./EventQueryValidator').validateModel;
var isSingleInputEvent = require('./EventQueryValidator').isSingleInputEvent;

module.exports.getModel = function() {
	var model = window.bpmnjs.getEqmnElements();
	var error = {};
	if(!validateModel(model, error)) {
		return error;
	}
	// store ids of already processed input events to handle them only once
	var queryModel = {}, element, processed = [], children, child;
	queryModel.warningMessage = error.warningMessage;
	for(var i=0; i<model.length; i++) {
		if(isConnection(model[i]) || !isUnprocessed(model[i], processed)) {
			continue;
		} else if(model[i].$type == "bpmn:TextAnnotation") {
			element = model[i];
		} else {
			element = getStartElement(model[i]);
		}
		switch(element.type || element.$type) {
			case "bpmn:TextAnnotation":
				if(element.incoming[0].source.type == "eqmn:Sequence"
				   && element.incoming[0].source.target.type == "eqmn:OutputEvent") {
					queryModel.condition = getConditionProperties(element);

				}
				break;
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
	var properties = {}, connection, text;
	properties.name = element.name || element.businessObject.name;		// type
	if(element.outgoing.length > 0) {								
		for(var i=0; i<element.outgoing.length; i++) {
			connection = element.outgoing[i];
			if(connection.type == "bpmn:Association") {		
				text = connection.target.businessObject.text;
				if(text.toLowerCase() == "first" || text.toLowerCase() == "last") {
					properties.selection = text;
				} else {
					properties.condition = text;
				}
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

function getConditionProperties(element) {
	return element.text;
}

function getIntervalProperties(element, processed) {
	var properties = {};
	properties.interval = {};
	properties.interval.value = element.name || element.businessObject.name;
	properties.interval.pattern = getComplexInputProperties(element.children, processed);
	processed.push(element.id);
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
		properties.window.value = element.name || element.businessObject.name;				// value (length/time)
	}
	return properties;
}