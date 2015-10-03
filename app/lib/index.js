// expose jquery to window
window.jQuery = require('jquery');

var domify = require('min-dom/lib/domify');

var angular = require('angular');

console.log("check 1");

var ngModule = module.exports = angular.module('app', [
  require('./dialog').name,
  require('./editor').name
]);

console.log("check 2");

// custom elements JSON; load it from somewhere else if you like
var customElements = require('./custom-elements.json');

console.log("check 3");

// our custom modeler
var CustomModeler = require('./custom-modeler');

console.log("check 4");

var overrideModule = {
    contextPadProvider: [ 'type', require('./custom-modeler/custom/CustomContextPadProvider') ],
    bpmnRules: [ 'type', require('./custom-modeler/custom/CustomRules') ],
    //modeling: [ 'type', require('./custom-modeler/custom/CustomModeling') ]
};

console.log("check 5");

var modeler = new CustomModeler({ 
    container: domify('<div>'), 
    keyboard: { bindTo: document },
    overrideModule
});

console.log("check 6");

//modeler.setCustomElements(customElements);

console.log("check 7");

// expose bpmnjs to window for debugging purposes
window.bpmnjs = modeler;
