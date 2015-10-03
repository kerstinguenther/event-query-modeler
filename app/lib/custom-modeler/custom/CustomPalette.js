'use strict';

var assign = require('lodash/object/assign');

/**
 * A palette that allows you to create BPMN _and_ custom elements.
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

		var shortType = type.replace(/^bpmn\:/, '').replace(/^custom\:/, '');

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
		'create.event-input': createAction(
			'custom:InputEvent', 'custom', 'icon-event-input'
		),
		'create.event-output': createAction(
			'custom:OutputEvent', 'custom', 'icon-event-output'
		),
		'create.operator-conjunction': createAction(
			'custom:ConjunctionOperator', 'custom', 'icon-operator-conjunction'
		),
		'create.operator-disjunction': createAction(
			'custom:DisjunctionOperator', 'custom', 'icon-operator-disjunction'
		),
		'create.operator-negation': createAction(
			'custom:NegationOperator', 'custom', 'icon-operator-negation'
		),
		'create.sequence-loose': createAction(
			'custom:LooseSequence', 'custom', 'icon-sequence-loose'
		),
		'create.sequence-strict': createAction(
			'custom:Sequence', 'custom', 'icon-sequence-strict'
		),
		'create.condition': createAction(
			'bpmn:TextAnnotation', 'bpmn', 'icon-condition'
		),
		'create.interval': createAction(
			'custom:Interval', 'custom', 'icon-interval'
		),
		'create.window': createAction(
			'custom:Window', 'custom', 'icon-window'
		),
		'create.window-time': createAction(
			'custom:TimeWindow', 'custom', 'icon-window-time'
		),
		'create.window-length': createAction(
			'custom:LengthWindow', 'custom', 'icon-window-length'
		),
	});

	return actions;
};
