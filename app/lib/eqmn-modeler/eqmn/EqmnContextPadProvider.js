var assign = require('lodash/object/assign');


function EqmnContextPadProvider(contextPad, modeling, elementFactory,
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
	
	function startLooseConnect(event, element, autoActivate) {
		connect.start(event, element, autoActivate, 'connect_loose');
	}

	function appendAction(type, className, options) {

		function appendListener(event, element) {

			var shape = elementFactory.createShape(assign({ type: type }, options));
			create.start(event, shape, element);
		}

		var shortType = type.replace(/^eqmn\:/, '');

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

	function getReplaceMenuPosition(element) {

		var Y_OFFSET = 5;

		var diagramContainer = canvas.getContainer(),
		pad = contextPad.getPad(element).html;

		var diagramRect = diagramContainer.getBoundingClientRect(),
		padRect = pad.getBoundingClientRect();

		var top = padRect.top - diagramRect.top;
		var left = padRect.left - diagramRect.left;

		var pos = {
				x: left,
				y: top + padRect.height + Y_OFFSET
		};

		return pos;
	}

	this.getContextPadEntries = function(element) {

		if(element.type == "eqmn:InputEvent") {
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
				
				'connect_loose': {
					group: 'connect',
					className: 'icon-sequence-loose',
					title: 'Connect using LooseSequence',
					action: {
						click: startLooseConnect,
						dragstart: startLooseConnect
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
		} else if(element.type == "eqmn:OutputEvent") {
			return {
				'append.text-annotation': appendAction('bpmn:TextAnnotation', 'icon-text-annotation'),

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
		} else if(element.type.indexOf("Operator")!=-1 ||
				element.type.indexOf("Window")!=-1 ||
				element.type == "eqmn:Interval") {
			return {
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
		}else {
			return {
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
		}

	};
}

EqmnContextPadProvider.$inject = [
                                  'contextPad',
                                  'modeling',
                                  'elementFactory',
                                  'connect',
                                  'create',
                                  'bpmnReplace',
                                  'canvas'
                                  ];

module.exports = EqmnContextPadProvider;
