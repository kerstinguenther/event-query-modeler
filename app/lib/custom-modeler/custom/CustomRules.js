'use strict';

var reduce = require('lodash/collection/reduce'),
inherits = require('inherits');

var is = require('bpmn-js/lib/util/ModelUtil').is;

var RuleProvider = require('diagram-js/lib/features/rules/RuleProvider');

var HIGH_PRIORITY = 1500;


function isCustom(element) {
	return element && /^custom\:/.test(element.type);
}

/**
 * Specific rules for custom elements
 */
function CustomRules(eventBus) {
	RuleProvider.call(this, eventBus);
}

inherits(CustomRules, RuleProvider);

CustomRules.$inject = [ 'eventBus' ];

module.exports = CustomRules;


CustomRules.prototype.init = function() {

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

//		  if (nonExistantOrLabel(source) || nonExistantOrLabel(target)) {
//		    return null;
//		  }
//
//		  // See https://github.com/bpmn-io/bpmn-js/issues/178
//		  // as a workround we disallow connections with same
//		  // target and source element.
//		  // This rule must be removed if a auto layout for this
//		  // connections is implemented.
//		  if (isSame(source, target)) {
//		    return false;
//		  }
//
//		  if (canConnectMessageFlow(source, target) ||
//		      canConnectSequenceFlow(source, target)) {
//		    return true;
//		  }
//
//
//		  if (is(connection, 'bpmn:Association')) {
//		    return canConnectAssociation(source, target);
//		  }
//
//		  return false;
		
			return true;
		}


	this.addRule('elements.move', HIGH_PRIORITY, function(context) {

		var target = context.target,
		shapes = context.shapes;

		// do not allow mixed movements of custom / BPMN shapes
		// if any shape cannot be moved, the group cannot be moved, too
		var allowed = reduce(shapes, function(result, s) {

			if (result === false || !isCustom(s)) {
				return false;
			}

			return canCreate(s, target);
		}, undefined);

		// reject, if we have at least one
		// custom element that cannot be moved
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
			// cannot resize custom elements
			return true;
		} else {
			false;
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