var assign = require('lodash/object/assign');


function CustomContextPadProvider(contextPad, modeling, elementFactory,
		connect, create, bpmnReplace,
		canvas) {

	contextPad.registerProvider(this);

	function removeElement(event, element) {
		if (element.waypoints) {
			modeling.removeConnection(element);
		} else {
			modeling.removeShape(element);
		}
	}

	function startConnect(event, element, autoActivate) {
		connect.start(event, element, autoActivate);
	}

	function appendAction(type, className, options) {

		function appendListener(event, element) {

			var shape = elementFactory.createShape(assign({ type: type }, options));
			create.start(event, shape, element);
		}

		var shortType = type.replace(/^custom\:/, '');

		return {
			group: 'model',
			className: className,
			title: 'Append ' + shortType,
			action: {
				dragstart: appendListener,
				click: appendListener
			}
		};
	}

	this.getContextPadEntries = function(element) {
		return {
			'append.text-annotation': appendAction('bpmn:TextAnnotation', 'icon-text-annotation'),

			'connect': {
				group: 'connect',
				className: 'icon-sequence-strict',
				title: 'Connect using Sequence',
				action: {
					click: startConnect,
					dragstart: startConnect
				}
			},

			'delete': {
				group: 'edit',
				className: 'icon-trash',
				title: 'Remove',
				action: {
					click: removeElement,
					dragstart: removeElement
				}
			}
		}
	};
}

CustomContextPadProvider.$inject = [
                                    'contextPad',
                                    'modeling',
                                    'elementFactory',
                                    'connect',
                                    'create',
                                    'bpmnReplace',
                                    'canvas'
                                    ];

module.exports = CustomContextPadProvider;
