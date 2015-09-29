// expose jquery to window
window.jQuery = require('jquery');

var angular = require('angular');

var ngModule = module.exports = angular.module('app', [
  require('./dialog').name,
  require('./editor').name
]);

// custom elements JSON; load it from somewhere else if you like
var customElements = require('./custom-elements.json');

// our custom modeler
var CustomModeler = require('./custom-modeler');

var overrideModule = {
		contextPadProvider: [ 'type', require('./custom-modeler/custom/CustomContextPadProvider') ]
};

var modeler = new CustomModeler({ container: '#canvas', keyboard: { bindTo: document },  additionalModules: [ overrideModule ]});

modeler.setCustomElements(customElements);

// expose bpmnjs to window for debugging purposes
window.bpmnjs = modeler;
