'use strict';

function CustomContextPadProvider(contextPad, elementFactory, connect) {

	contextPad.registerProvider(this);

	this.getContextPadEntries = function(element) {

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

		return {
			'append.text-annotation': appendAction('bpmn:TextAnnotation', 'icon-text-annotation'),

			'connect': {
				group: 'connect',
				className: 'icon-connection-multi',
				title: 'Connect using Sequence/MessageFlow',
				action: {
					click: startConnect,
					dragstart: startConnect
				}
			}
		};
	};
}

CustomContextPadProvider.prototype.getContextPadEntries = function(element) {

CustomContextPadProvider.$inject = [ 'contextPad', 'connect', 'elementFactory' ];