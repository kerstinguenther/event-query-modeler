var files = require('../util/files'),
workspace = require('../util/workspace'),
assign = require('lodash/object/assign'),
forEach = require('lodash/collection/forEach'),
DiagramControl = require('./diagram/control'),
createQuery = require('../eq-creator/EventQueryCreator').createQuery;

var onDrop = require('../util/on-drop');

var initDiagram =
	  '<?xml version="1.0" encoding="UTF-8"?>' +
	  '<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' +
	                    'xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" ' +
	                    'xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" ' +
	                    'xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" ' +
	                    'targetNamespace="http://bpmn.io/schema/bpmn" ' +
	                    'id="Definitions_1">' +
	    '<bpmn:process id="Process_1" isExecutable="false">' +
	      '<bpmn:startEvent id="StartEvent_1"/>' +
	    '</bpmn:process>' +
	    '<bpmndi:BPMNDiagram id="BPMNDiagram_1">' +
	      '<bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">' +
	      '</bpmndi:BPMNPlane>' +
	    '</bpmndi:BPMNDiagram>' +
	  '</bpmn:definitions>';

function Editor($scope, dialog, $http, $window, creator) {

	var idx = 0;

	this.currentDiagram = null;
	this.diagrams = [];
	this.views = {
			diagram: true,
			eventTypes: true,
			esper: false
	};

	this.canUndo = function() {
		return this.currentDiagram && this.currentDiagram.control.canUndo;
	};

	this.canRedo = function() {
		return this.currentDiagram && this.currentDiagram.control.canRedo;
	};

	this.isUnsaved = function() {
		return this.currentDiagram && this.currentDiagram.unsaved;
	};

	this.isOpen = function() {
		return this.currentDiagram;
	};

	this.undo = function() {
		if (this.currentDiagram) {
			this.currentDiagram.control.undo();
		}
	};

	this.redo = function() {
		if (this.currentDiagram) {
			this.currentDiagram.control.redo();
		}
	};

	this.saveDiagram = function(diagram, options, done) {
		if (typeof options === 'function') {
			done = options;
			options = {};
		}

		function handleSaving(err) {
			console.log(err);

			if (!err) {
				diagram.control.resetEditState();
			}

			$scope.$applyAsync();

			return done(err);
		}

		var model = $window.bpmnjs.getEqmnElements();
		console.log(model);

		diagram.contents = model;
		files.saveJson(diagram, options, handleSaving);
	};

	this.save = function(create) {

		// TODO: check validity of json

		var active = this.currentDiagram;

		if (active) {
			this.saveDiagram(active, { create: create || false }, function(err) {
				console.log(err);
			});
		}
	};

	this.newDiagram = function(filename, filepath) {

		var diagram = {
				name: filename || 'model_' + (idx++) + '.eqmn',
				path: filepath || '[unsaved]'
		};

		this.showDiagram(diagram);

		$scope.$applyAsync();
	};

	this.isActive = function(diagram) {
		return this.currentDiagram === diagram;
	};

	/**
	 * Open diagram file via the editor and show it
	 */
	this.openDiagram = function() {

		var self = this;

		files.openFile(function(err, diagram) {

			if (err) {
				return console.error(err);
			}

			console.log(diagram);
			//self._openDiagram(diagram);

			self.newDiagram(diagram.name);
			$scope.$applyAsync();

			$window.bpmnjs.importXML(initDiagram, function(err) {

				if (err) {
					console.error('something went wrong:', err);
				}

				$window.bpmnjs.get('canvas').zoom('fit-viewport');

				$window.bpmnjs.setEqmnElements(JSON.parse(diagram.contents));
			});
		});
	};

	this._openDiagram = function(file) {
		if (file) {
			this.diagrams.push(file);
			this.showDiagram(file);
			this.persist();
		}
	};

	/**
	 * Show diagram (or null)
	 *
	 * @param  {DiagramFile} [diagram]
	 */
	this.showDiagram = function(diagram) {
		this.currentDiagram = diagram;

		var diagrams = this.diagrams;

		if (diagram) {
			if (diagrams.indexOf(diagram) === -1) {
				diagrams.push(diagram);
			}

			if (!diagram.control) {
				diagram.control = new DiagramControl(diagram);
			}
		}

		this.persist();
	};

	this._closeDiagram = function(diagram) {
		var diagrams = this.diagrams,
		idx = diagrams.indexOf(diagram);

		diagrams.splice(idx, 1);

		if (diagram.control) {
			diagram.control.destroy();
		}

		if (this.isActive(diagram)) {
			this.showDiagram(diagrams[idx] || diagrams[idx - 1]);
		}

		$scope.$applyAsync();
	};

	/**
	 * Close the selected diagram, asking the user for
	 * the unsaved action, if any.
	 *
	 * @param  {DiagramFile} diagram
	 */
	this.closeDiagram = function(diagram) {

		var self = this;

		if (diagram.unsaved) {
			dialog.confirm('Save changes to ' + diagram.name + ' before closing?', {
				cancel: { label: 'Cancel' },
				close: { label: 'Don\'t Save'},
				save: { label: 'Save', defaultAction: true }
			}, function(result) {
				if (result === 'save') {
					self.saveDiagram(diagram, function(err) {
						self._closeDiagram(diagram);
					});
				}

				if (result === 'close') {
					self._closeDiagram(diagram);
				}
			});
		} else {
			self._closeDiagram(diagram);
		}

		$scope.$applyAsync();
	};

	this.persist = function() {
		workspace.save(this, function() {
			console.log(arguments);
		});
	};

	this.toggleView = function(name) {
		var views = Object.keys(this.views);
		var idx = views.indexOf(name);

		if(name!='diagram' && this.views[name] == false) {
			for(i=1; i<views.length; i++) {
				this.views[views[i]] = false;
			}
		}
		this.views[name] = !this.views[name];

		if(!this.views.diagram && !this.views.xml) {
			views.splice(idx, 1);
			this.views[views[0]] = true;
		}
	};

	this.isActiveView = function(name) {
		return this.views[name];
	};

	this.init = function() {

		var self = this;

		console.debug('[editor]', 'restoring workspace');

		workspace.restore(function(err, config) {
			console.debug('[editor]', 'done');

			if (!err) {
				assign(self, config);
			}

			var openEntry = workspace.getOpenEntry();

			if (openEntry) {
				console.debug('[editor]', 'open diagram', openEntry);

				files.loadFile(openEntry, function(err, diagram) {

					if (!err) {
						self.showDiagram(diagram);
					}

					$scope.$applyAsync();
				});
			} else {
				self.showDiagram(config.active);
				$scope.$applyAsync();
			}
		});

		onDiagramDrop(function(err, file) {

			if (err) {
				return console.error(err);
			}

			self._openDiagram(file);

			$scope.$applyAsync();
		});

		function modifierPressed(event) {
			return event.metaKey || event.ctrlKey;
		}

		document.addEventListener('keydown', function(e) {

			if (!modifierPressed(e)) {
				return;
			}

			// save - 83 (S) + meta/ctrl
			if (e.keyCode === 83) {
				e.preventDefault();
				self.save();
			}

			// save as - 83 (S) + meta/ctrl + shift
			if (e.keyCode === 83 && e.shiftKey) {
				e.preventDefault();
				self.save(true);
			}

			// open - 79 (O) + meta/ctrl
			if (e.keyCode === 79) {
				e.preventDefault();
				self.openDiagram();
			}

			// new diagram - (T/N) 84 + meta/ctrl
			if (e.keyCode === 84 || e.keyCode === 78) {
				e.preventDefault();
				self.newDiagram();
			}

			// close tab - (W) - 87 + meta/ctrl
			if (e.keyCode === 87 && self.currentDiagram) {
				e.preventDefault();
				self.closeDiagram(self.currentDiagram);
			}
		});

		// init URL for Web Service
		$scope.url = "http://gas:getwp6@bpt.hpi.uni-potsdam.de/GETAggregationService/services/EventProcessingPlatformWebservice/getAllEventTypes";

	};

	this.init();

	/*
	 * custom part
	 */
	this.urlChanged = function(val) {
		$scope.url = val;
	}

	this.loadEventTypesViaXsd = function() {
		$scope.eventTypes = "xsd";
	}

	this.loadEventTypesViaWsdl = function() {
		var eventTypes, type, t, attributeNames, attributes;
		$scope.eventTypes = {};
		$window.eventTypes = {};
		$http.get($scope.url)
		.success(function(data) {
			eventTypes = getValuesFromXml(data);
			for(i=0; i<eventTypes.length; i++) {
				type = eventTypes[i];
				$http.get("http://gas:getwp6@bpt.hpi.uni-potsdam.de/GETAggregationService/services/EventProcessingPlatformWebservice/getEventTypeXSD?eventTypeName=" + type)
				.success(function(data, status, headers, config) {
					t = config.url.split("=")[1];
					console.log(t + ": SUCCESS");
					attributes = [];
					attributeNames = getAttributesFromXsd(data);
					for(name of attributeNames) {
						attributes.push(name);
					}
					$scope.eventTypes[t] = attributes;
					$window.eventTypes[t] = attributes;
					$scope.errorMessage = "";
				})
				.error(function(data, status, headers, config) {
					t = config.url.split("=")[1];
					console.log(t + ": ERROR");
				});
			}
		})
		.error(function(data, status, headers, config) {
			$scope.eventTypes = { };
			$scope.errorMessage = "Loading failed. Possible reasons: incorrect authentication, incorrect URL.";
		});
	}

	function getValuesFromXml(xml) {
		return xml.replace(/<[^>]*>/g, " ").replace(/ +/g, " ").trim().split(" ");
	}

	function getAttributesFromXsd(xsd) {
		var attributes = [];
		var elements = xsd.match(/(<|&lt;)xs:element[^>]*>/g);
		var element, e, type, name;
		// first element is event type
		for(i=1; i<elements.length; i++) {
			element = elements[i].split(" ");
			for(j=0; j<element.length; j++) {
				e = element[j];
				if(e.indexOf("type")!=-1) { 
					type = e.replace(/type="/, "").split(/\s+/g)[0].split(":").reverse()[0].replace(/[^a-zA-Z.]/, "");
				} else if(e.indexOf("name")!=-1) { 
					name = e.replace(/name="/, "").replace(/[^a-zA-Z.]/, "");
				}
			}
			attributes.push(name + ": " + type);
		}
		return attributes;
	}
	
	this.updateQuery = function(language) {
		$scope.model = createQuery(language);
	}
}

Editor.$inject = [ '$scope', 'dialog', '$http', '$window' ];

module.exports = Editor;


function onDiagramDrop(callback) {

	// Support dropping a single file onto this app.
	dnd = onDrop('body', function(data) {
		console.log(data);

		var entry;

		for (var i = 0; i < data.items.length; i++) {
			var item = data.items[i];
			if (item.kind == 'file' && item.webkitGetAsEntry()) {
				entry = item.webkitGetAsEntry();
				break;
			}
		}

		if (entry) {
			files.loadFile(entry, callback);
		} else {
			callback(new Error('not a diagram file'));
		}
	});
}
