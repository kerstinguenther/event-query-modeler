'use strict';

var inherits = require('inherits');

var pick = require('lodash/object/pick'),
    assign = require('lodash/object/assign');

var CommandInterceptor = require('diagram-js/lib/command/CommandInterceptor');

var Collections = require('diagram-js/lib/util/Collections');


function isEqmn(element) {
  return element && /eqmn\:/.test(element.type);
}

function ifEqmnElement(fn) {
  return function(event) {
    var context = event.context,
        element = context.shape || context.connection;

    if (isEqmn(element)) {
      fn(event);
    }
  };
}

/**
 * A handler responsible for updating the eqmn element's businessObject
 * once changes on the diagram happen.
 */
function EqmnUpdater(eventBus, bpmnjs) {

  CommandInterceptor.call(this, eventBus);

  function updateEqmnElement(e) {
    var context = e.context,
        shape = context.shape,
        businessObject = shape.businessObject;

    var parent = shape.parent;

    var eqmnElements = bpmnjs.getEqmnElements();

    // make sure element is added / removed from bpmnjs.eqmnElements
    if (!parent) {
      Collections.remove(eqmnElements, businessObject);
    } else {
      Collections.add(eqmnElements, businessObject);
    }

    // save eqmn element position
    assign(businessObject, pick(shape, [ 'x', 'y' ]));
    
    console.log(eqmnElements);
  }

  this.executed([
    'shape.create',
    'shape.move',
    'shape.delete'
  ], ifEqmnElement(updateEqmnElement));

  this.reverted([
    'shape.create',
    'shape.move',
    'shape.delete'
  ], ifEqmnElement(updateEqmnElement));

}

inherits(EqmnUpdater, CommandInterceptor);

module.exports = EqmnUpdater;

EqmnUpdater.$inject = [ 'eventBus', 'bpmnjs' ];
