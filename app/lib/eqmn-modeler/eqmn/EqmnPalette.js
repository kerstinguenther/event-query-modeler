'use strict';

var assign = require('lodash/object/assign');

/**
 * A palette that allows you to create BPMN _and_ eqmn elements.
 */
function PaletteProvider(palette, create, elementFactory, spaceTool, lassoTool) {

	this._create = create;
	this._elementFactory = elementFactory;
	this._spaceTool = spaceTool;
	this._lassoTool = lassoTool;

	palette.registerProvider(this);
}

module.exports = PaletteProvider;

PaletteProvider.$inject = [ 'palette', 'create', 'elementFactory', 'spaceTool', 'lassoTool' ];


PaletteProvider.prototype.getPaletteEntries = function(element) {

	var actions  = {},
	create = this._create,
	elementFactory = this._elementFactory,
	spaceTool = this._spaceTool,
	lassoTool = this._lassoTool;


	function createAction(type, group, className, title, options) {

		function createListener(event) {
			var shape = elementFactory.createShape(assign({ type: type }, options));

			if (options) {
				shape.businessObject.di.isExpanded = options.isExpanded;
			}

			create.start(event, shape);
		}

		var shortType = type.replace(/^bpmn\:/, '').replace(/^eqmn\:/, '');

		return {
			group: group,
			className: className,
			title: title || 'Create ' + shortType,
			action: {
				dragstart: createListener,
				click: createListener
			}
		};
	}

	function createParticipant(event, collapsed) {
		create.start(event, elementFactory.createParticipantShape(collapsed));
	}

	assign(actions, {
	    'lasso-tool': {
	        group: 'tools',
	        className: 'icon-lasso-tool',
	        title: 'Activate the lasso tool',
	        action: {
	          click: function(event) {
	            lassoTool.activateSelection(event);
	          }
	        }
	      },
	      'space-tool': {
	        group: 'tools',
	        className: 'icon-space-tool',
	        title: 'Activate the create/remove space tool',
	        action: {
	          click: function(event) {
	            spaceTool.activateSelection(event);
	          }
	        }
	      },
	      'tool-separator': {
	        group: 'tools',
	        separator: true
	      },
		'create.event-input': createAction(
			'eqmn:InputEvent', 'eqmn', 'icon-event-input'
		),
		'create.event-output': createAction(
			'eqmn:OutputEvent', 'eqmn', 'icon-event-output'
		),
		'create.operator-conjunction': createAction(
			'eqmn:ConjunctionOperator', 'eqmn', 'icon-operator-conjunction'
		),
		'create.operator-disjunction': createAction(
			'eqmn:DisjunctionOperator', 'eqmn', 'icon-operator-disjunction'
		),
		'create.operator-negation': createAction(
			'eqmn:NegationOperator', 'eqmn', 'icon-operator-negation'
		),
		'create.interval': createAction(
			'eqmn:Interval', 'eqmn', 'icon-interval'
		),
		'create.window': createAction(
			'eqmn:Window', 'eqmn', 'icon-window'
		),
		'create.window-time': createAction(
			'eqmn:TimeWindow', 'eqmn', 'icon-window-time'
		),
		'create.window-length': createAction(
			'eqmn:LengthWindow', 'eqmn', 'icon-window-length'
		),
	});

	return actions;
};
