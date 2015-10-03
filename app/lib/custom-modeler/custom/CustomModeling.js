'use strict';

var inherits = require('inherits');
var BaseModeling = require('diagram-js/lib/features/modeling/Modeling');

var UpdatePropertiesHandler = require('bpmn-js/lib/features/modeling/cmd/UpdatePropertiesHandler'),
UpdateCanvasRootHandler = require('bpmn-js/lib/features/modeling/cmd/UpdateCanvasRootHandler');

function CustomModeling(eventBus, elementFactory, commandStack, customRules) {
	BaseModeling.call(this, eventBus, elementFactory, commandStack);
	this._customRules = customRules;
}

CustomModeling.prototype.getHandlers = function() {
	var handlers = BaseModeling.prototype.getHandlers.call(this);

	handlers['element.updateProperties'] = UpdatePropertiesHandler;
	handlers['canvas.updateRoot'] = UpdateCanvasRootHandler;

	return handlers;
};

CustomModeling.prototype.connect = function(source, target, attrs) {
	var customRules = this._customRules;

	if (!attrs) {
		if (customRules.canConnectSequence(source, target)) {
			attrs = {
					type: 'custom:Sequence'
			};
		} else if(customRules.canConnectAssociation(source, target)) {
			attrs = {
					type: 'custom:Association'
			};
		} 
	}

	return this.createConnection(source, target, attrs, source.parent);
}

CustomModeling.prototype.createConnection = function(source, target, attrs) {
	console.log("just test if it works");
}

inherits(CustomModeling, BaseModeling);

CustomModeling.$inject = [ 'eventBus', 'elementFactory', 'commandStack', 'bpmnRules' ];

module.exports = CustomModeling;