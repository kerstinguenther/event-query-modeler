'use strict';

var reduce = require('lodash/collection/reduce'),
inherits = require('inherits');

var is = require('bpmn-js/lib/util/ModelUtil').is;

var RuleProvider = require('diagram-js/lib/features/rules/RuleProvider');

var HIGH_PRIORITY = 150000;


function isEqmn(element) {
	return element && /^eqmn\:/.test(element.type);
}

/**
 * Specific rules for eqmn elements
 */
function EqmnRules(eventBus) {
	RuleProvider.call(this, eventBus);
}

inherits(EqmnRules, RuleProvider);

EqmnRules.$inject = [ 'eventBus' ];

module.exports = EqmnRules;


EqmnRules.prototype.init = function() {

	this.addRule('elements.move', HIGH_PRIORITY, function(context) {

		var target = context.target,
		shapes = context.shapes;

		// do not allow mixed movements of eqmn / BPMN shapes
		// if any shape cannot be moved, the group cannot be moved, too
		var allowed = reduce(shapes, function(result, s) {

			if (result === false) {
				return false;
			}

			return canCreate(s, target);
		}, undefined);

		// reject, if we have at least one
		// eqmn element that cannot be moved
		return allowed;
	});

	this.addRule('shape.create', HIGH_PRIORITY, function(context) {
		var target = context.target,
		shape = context.shape;

		return canCreate(shape, target);
	});

	this.addRule('shape.resize', HIGH_PRIORITY, function(context) {
		var shape = context.shape;

		if (shape.type.indexOf('Window') != -1 || shape.type.indexOf('Interval') != -1) {
			return true;
		} else {
			return false;
		}
	});

	this.addRule('connection.create', function(context) {
		var source = context.source,
		target = context.target;

		return canConnect(source, target);
	});

	this.addRule('connection.reconnectStart', function(context) {

		var connection = context.connection,
		source = context.hover || context.source,
		target = connection.target;

		return canConnect(source, target, connection);
	});

	this.addRule('connection.reconnectEnd', function(context) {

		var connection = context.connection,
		source = connection.source,
		target = context.hover || context.target;

		return canConnect(source, target, connection);
	});

	this.addRule('connection.updateWaypoints', function(context) {
		// OK! but visually ignore
		return null;
	});

};

EqmnRules.prototype.canAttach = canAttach;

EqmnRules.prototype.canCreate = canCreate;

EqmnRules.prototype.canConnect = canConnect;

EqmnRules.prototype.canInsert = canInsert;

EqmnRules.prototype.canDrop = canDrop;

EqmnRules.prototype.canReplace = canReplace;

EqmnRules.prototype.canConnectSequence = canConnectSequence;

EqmnRules.prototype.canConnectLooseSequence = canConnectLooseSequence;

EqmnRules.prototype.canConnectAssociation = canConnectAssociation;

/**
 * Can shape be created on target container?
 */
function canCreate(shape, target) {

	if(target) {
		// allow one input event in windows
		if(shape.type.indexOf('InputEvent') != -1 && target.type.indexOf('Window') != -1 && target.children.length == 0) {
			return true;
		}

		// allow multiple input events and operators in intervals
		if(target.type.indexOf('Interval') != -1 && (shape.type.indexOf('InputEvent') != -1 || shape.type.indexOf('Operator') != -1)) {
			return true;
		}
	}

	// allow creation on processes
	return is(target, 'bpmn:Process') || is(target, 'bpmn:Participant') || is(target, 'bpmn:Collaboration');
}

function canConnect(source, target, connection) {

//	if (nonExistantOrLabel(source) || nonExistantOrLabel(target)) {
//	return null;
//	}

//	// See https://github.com/bpmn-io/bpmn-js/issues/178
//	// as a workround we disallow connections with same
//	// target and source element.
//	// This rule must be removed if a auto layout for this
//	// connections is implemented.
//	if (isSame(source, target)) {
//	return false;
//	}

//	if (canConnectMessageFlow(source, target) ||
//	canConnectSequenceFlow(source, target)) {
//	return true;
//	}


//	if (is(connection, 'bpmn:Association')) {
//	return canConnectAssociation(source, target);
//	}

//	return false;

	return true;
}

function canAttach(elements, target, source, position) {

	// disallow appending as boundary event
	if (source) {
		return false;
	}

	// only (re-)attach one element at a time
	if (elements.length !== 1) {
		return false;
	}

	var element = elements[0];

	// do not attach labels
	if (isLabel(element)) {
		return false;
	}

	// only handle boundary events
//	if (!isBoundaryCandidate(element)) {
//	return false;
//	}

	// allow default move operation
	if (!target) {
		return true;
	}

	// disallow drop on event sub processes
//	if (isEventSubProcess(target)) {
//	return false;
//	}

	// only allow drop on activities
//	if (!is(target, 'bpmn:Activity')) {
//	return false;
//	}

	// only attach to subprocess border
//	if (position && !isBoundaryAttachment(position, target)) {
//	return false;
//	}

	return 'attach';
}

function canInsert(shape, flow, position) {

	// return true if we can drop on the
	// underlying flow parent
	//
	// at this point we are not really able to talk
	// about connection rules (yet)
//	return (
//	is(flow, 'bpmn:SequenceFlow') ||
//	is(flow, 'bpmn:MessageFlow')
//	) && is(shape, 'bpmn:FlowNode') && !is(shape, 'bpmn:BoundaryEvent') &&

	canDrop(shape, flow.parent, position);
}

/**
 * Can an element be dropped into the target element
 *
 * @return {Boolean}
 */
function canDrop(element, target) {

	// can move labels everywhere
	if (isLabel(element) && !isConnection(target)) {
		return true;
	}

	// allow to create new participants on
	// on existing collaboration and process diagrams
//	if (is(element, 'bpmn:Participant')) {
//	return is(target, 'bpmn:Process') || is(target, 'bpmn:Collaboration');
//	}

	// allow creating lanes on participants and other lanes only
//	if (is(element, 'bpmn:Lane')) {
//	return is(target, 'bpmn:Participant') || is(target, 'bpmn:Lane');
//	}

//	if (is(element, 'bpmn:BoundaryEvent')) {
//	return false;
//	}

	// drop flow elements onto flow element containers
	// and participants
//	if (is(element, 'bpmn:FlowElement')) {
//	if (is(target, 'bpmn:FlowElementsContainer')) {
//	return isExpanded(target) !== false;
//	}

//	return is(target, 'bpmn:Participant') || is(target, 'bpmn:Lane');
//	}

//	if (is(element, 'bpmn:Artifact')) {
//	return is(target, 'bpmn:Collaboration') ||
//	is(target, 'bpmn:Participant') ||
//	is(target, 'bpmn:Process');
//	}

//	if (is(element, 'bpmn:MessageFlow')) {
//	return is(target, 'bpmn:Collaboration');
//	}

	return false;
}

function canReplace(elements, target) {

	if (!target) {
		return false;
	}

	var canExecute = {
			replacements: []
	};

	return true;
}

function canConnectAssociation(source, target) {

	// do not connect connections
	if (isConnection(source) || isConnection(target)) {
		return false;
	}

	// connect if different parent
//	return !isParent(target, source) &&
//	!isParent(source, target);
	return true;
}

function canConnectSequence(source, target) {

	// do not connect connections
	if (isConnection(source) || isConnection(target)) {
		return false;
	}

	// connect if different parent
//	return !isParent(target, source) &&
//	!isParent(source, target);
	if(isEqmn(target)) {
		return true;
	}
	
	return false;
}

function canConnectLooseSequence(source, target) {

	// do not connect connections
	if (isConnection(source) || isConnection(target)) {
		return false;
	}

	// connect if different parent
//	return !isParent(target, source) &&
//	!isParent(source, target);
	if(isEqmn(target)) {
		return true;
	}
	
	return false;
}

function isLabel(element) {
	return element.labelTarget;
}

function isConnection(element) {
	return element.waypoints;
}


