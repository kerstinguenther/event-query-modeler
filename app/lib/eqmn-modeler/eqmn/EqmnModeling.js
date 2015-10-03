'use strict';

var inherits = require('inherits');
var BaseModeling = require('diagram-js/lib/features/modeling/Modeling');

var UpdatePropertiesHandler = require('bpmn-js/lib/features/modeling/cmd/UpdatePropertiesHandler'),
UpdateCanvasRootHandler = require('bpmn-js/lib/features/modeling/cmd/UpdateCanvasRootHandler');

function EqmnModeling(eventBus, elementFactory, commandStack, eqmnRules) {
	BaseModeling.call(this, eventBus, elementFactory, commandStack);
	this._eqmnRules = eqmnRules;
}

EqmnModeling.prototype.getHandlers = function() {
	var handlers = BaseModeling.prototype.getHandlers.call(this);

	handlers['element.updateProperties'] = UpdatePropertiesHandler;
	handlers['canvas.updateRoot'] = UpdateCanvasRootHandler;

	return handlers;
};

EqmnModeling.prototype.connect = function(source, target, attrs) {
	var eqmnRules = this._eqmnRules;

	if(attrs == "loose") {
		attrs = {
				type: 'eqmn:LooseSequence'
		};
	} else if (!attrs) {
		if (eqmnRules.canConnectSequence(source, target)) {
			attrs = {
					type: 'eqmn:Sequence'
			};
		} else if(eqmnRules.canConnectAssociation(source, target)) {
			attrs = {
					type: 'eqmn:Association'
			};
		} 
	}

	return this.createConnection(source, target, attrs, source.parent);
}

EqmnModeling.prototype.createConnection = function(source, target, attrs) {
	console.log("just test if it works");
}

inherits(EqmnModeling, BaseModeling);

EqmnModeling.$inject = [ 'eventBus', 'elementFactory', 'commandStack', 'bpmnRules' ];

module.exports = EqmnModeling;