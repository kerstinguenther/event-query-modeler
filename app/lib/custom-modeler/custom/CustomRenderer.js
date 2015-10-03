'use strict';

var inherits = require('inherits');
var assign = require('lodash/object/assign');

var BaseRenderer = require('diagram-js/lib/draw/BaseRenderer');
var ElementFactory = require('diagram-js/lib/core/ElementFactory');
var TextUtil = require('diagram-js/lib/util/Text');

var componentsToPath = require('diagram-js/lib/util/RenderUtil').componentsToPath;
var getExternalLabelBounds = require('bpmn-js/lib/util/LabelUtil').getExternalLabelBounds;

var LABEL_STYLE = {
		fontFamily: 'Arial, sans-serif',
		fontSize: '12px'
};

/**
 * A renderer that knows how to render custom elements.
 */
function CustomRenderer(eventBus, styles, customPathMap, elementFactory, canvas) {

	BaseRenderer.call(this, eventBus, 2000);

	this._styles = styles;

	var self = this;

	var textUtil = new TextUtil({
		style: LABEL_STYLE,
		size: { width: 100 }
	});

	var computeStyle = styles.computeStyle;

	var marker_looseSequence, marker_sequence_end;
	
	function initMarkers(svg) {
		marker_looseSequence = createMarker({
		      element: svg.path('M 1 4 L 5 16'),
		      attrs: {
		        stroke: 'black'
		      },
		      ref: { x: -5, y: 10 },
		      scale: 0.5
		    });
		marker_sequence_end = createMarker({
			element: svg.path('M 1 5 L 11 10 L 1 15 Z'),
		      ref: { x: 11, y: 10 },
		      scale: 0.5
		    });
	} 

	function createMarker(options) {
		var attrs = assign({
			fill: 'black',
			strokeWidth: 1,
			strokeLinecap: 'round',
			strokeDasharray: 'none'
		}, options.attrs);

		var ref = options.ref || { x: 0, y: 0 };

		var scale = options.scale || 1;

		// fix for safari / chrome / firefox bug not correctly
		// resetting stroke dash array
		if (attrs.strokeDasharray === 'none') {
			attrs.strokeDasharray = [10000, 1];
		}

		var marker = options.element
		.attr(attrs)
		.marker(0, 0, 20, 20, ref.x, ref.y)
		.attr({
			markerWidth: 20 * scale,
			markerHeight: 20 * scale
		});

		return marker;
	}

	function getSemantic(element) {
		return element.businessObject;
	}


	function drawCircle(p, cx, cy, width, height, attrs) {

		attrs = computeStyle(attrs, {
			stroke: 'black',
			fill: 'white'
		});

		return p.circle(cx, cy, Math.round((width + height) / 4)).attr(attrs);
	};

	function drawRect(p, width, height, attrs) {

		attrs = computeStyle(attrs, {
			stroke: 'black',
			strokeWidth: 2,
			fill: 'white'
		});

		return p.rect(0, 0, width, height).attr(attrs);
	}

	function drawOctagon(p, width, height, attrs) {
		var x_4 = width / 4;
		var y_4 = height / 4;

		var points = [x_4, 0, x_4*3, 0, width, y_4, width, y_4*3, x_4*3, height, x_4, height, 0, y_4*3, 0, y_4 ];

		attrs = computeStyle(attrs, {
			stroke: 'black',
			strokeWidth: 2,
			fill: 'white'
		});

		return p.polygon(points).attr(attrs);
	};

	function drawPath(p, d, attrs) {

		attrs = computeStyle(attrs, [ 'no-fill' ], {
			strokeWidth: 2,
			stroke: 'black'
		});

		return p.path(d).attr(attrs);
	}

	function renderLabel(p, label, options) {
		return textUtil.createText(p, label || '', options).addClass('djs-label');
	}

	function renderLabelBelow(p, element, align) {
		var semantic = getSemantic(element);
		return renderLabel(p, semantic.name, { box: element, align: align, padding: 5, margin: (element.height-10) });
	}

	function renderLabelAbove(p, element, align) {
		var semantic = getSemantic(element);
		return renderLabel(p, semantic.name, { box: element, align: align, padding: 5, margin: -(element.height-10) });
	}

	this.handlers = {
			'custom:InputEvent': function(p, element, attrs) {
				//addLabel(element);
				var shape = self.drawInputEvent(p, element.width, element.height,  attrs);
				renderLabelBelow(p, element, 'center-middle');
				return shape;
			},
			'custom:OutputEvent': function(p, element, attrs) {
				var shape = self.drawOutputEvent(p, element.width, element.height,  attrs);
				renderLabelAbove(p, element, 'center-middle');
				return shape;
			},
			'custom:ConjunctionOperator': function(p, element, attrs) {
				return self.drawConjunctionOperator(p, element.width, element.height,  attrs);
			},
			'custom:DisjunctionOperator': function(p, element, attrs) {
				return self.drawDisjunctionOperator(p, element.width, element.height,  attrs);
			},
			'custom:NegationOperator': function(p, element, attrs) {
				return self.drawNegationOperator(p, element.width, element.height,  attrs);
			},
			'custom:Interval': function(p, element, attrs) {
				return self.drawInterval(p, element.width, element.height,  attrs);
			},
			'custom:Window': function(p, element, attrs) {
				return self.drawWindow(p, element.width, element.height,  attrs);
			},
			'custom:TimeWindow': function(p, element, attrs) {
				return self.drawTimeWindow(p, element.width, element.height,  attrs);
			},
			'custom:LengthWindow': function(p, element, attrs) {
				return self.drawLengthWindow(p, element.width, element.height,  attrs);
			},
			'custom:Sequence': function(p, element) {
				var pathData = createPathFromConnection(element);
				var path = drawPath(p, pathData, {
					strokeLinejoin: 'round',
					markerEnd: marker_sequence_end
				});

				return path;
			},
			'custom:LooseSequence': function(p, element) {
				var pathData = createPathFromConnection(element);
				var path = drawPath(p, pathData, {
					strokeLinejoin: 'round',
					markerEnd: marker_sequence_end
				});

				var sequenceFlow = getSemantic(element);
				var source = element.source.businessObject;

				// add marker
				path.attr({
					markerStart: marker_looseSequence
				});

				return path;
			},
			'label': function(p, element) {
				return renderExternalLabel(p, element, '');
			},
	};

	this.drawInputEvent = function(p, width, height, attrs) {
		var circle = drawCircle(p, width/2, height/2, width, height, { strokeWidth: 2 });
		return circle;
	};

	this.drawOutputEvent = function(p, width, height, attrs) {
		var circle = drawCircle(p, width/2, height/2, width, height, { strokeWidth: 7 });
		return circle;
	};

	this.drawConjunctionOperator = function(p, width, height, attrs) {
		var operator = drawOctagon(p, width, height, attrs);

		var pathData = customPathMap.getScaledPath('OPERATOR_CONJUNCTION', {
			xScaleFactor: 0.4,
			yScaleFactor:0.4,
			containerWidth: width,
			containerHeight: height,
			position: {
				mx: 0.3,
				my: 0.7
			}
		});

		drawPath(p, pathData, {
			strokeWidth: 4,
			fill: 'none'
		});

		return operator;
	};

	this.drawDisjunctionOperator = function(p, width, height, attrs) {
		var operator = drawOctagon(p, width, height, attrs);

		var pathData = customPathMap.getScaledPath('OPERATOR_DISJUNCTION', {
			xScaleFactor: 0.4,
			yScaleFactor:0.4,
			containerWidth: width,
			containerHeight: height,
			position: {
				mx: 0.3,
				my: 0.3
			}
		});

		drawPath(p, pathData, {
			strokeWidth: 4,
			fill: 'none'
		});

		return operator;
	};

	this.drawNegationOperator = function(p, width, height, attrs) {
		var operator = drawOctagon(p, width, height, attrs);

		var pathData = customPathMap.getScaledPath('OPERATOR_NEGATION', {
			xScaleFactor: 0.4,
			yScaleFactor:0.2,
			containerWidth: width,
			containerHeight: height,
			position: {
				mx: 0.3,
				my: 0.4
			}
		});

		drawPath(p, pathData, {
			strokeWidth: 4,
			fill: 'none'
		});

		return operator;
	};

	this.drawWindow = function(p, width, height, attrs) {
		return drawRect(p, width, height, {
			strokeDasharray: '2,2'
		});
	};

	this.drawInterval = function(p, width, height, attrs) {
		return drawRect(p, width, height, {
			strokeDasharray: '2,8'
		});
	};


	this.drawTimeWindow = function(p, width, height, attrs) {
		var window = self.drawWindow(p, width, height, attrs);

		drawCircle(p, width/2, 0, 20, 20, { 
			strokeWidth: 2
		});

		var pathData = customPathMap.getRawPath('WINDOW_TIME', width/2, 0);
//		{
//		xScaleFactor: 0.5,
//		yScaleFactor: 0.5,
//		containerWidth: width,
//		containerHeight: height,
//		position: {
//		mx: 0.5,
//		my: 0
//		}
//		});

		drawPath(p, pathData, {
			strokeWidth: 2,
			fill: 'none'
		});

		return window;
	};

	this.drawLengthWindow = function(p, width, height, attrs) {
		var window = self.drawWindow(p, width, height, attrs);

		drawCircle(p, width/2, 0, 20, 20, { 
			strokeWidth: 2
		});

		var pathData = customPathMap.getRawPath('WINDOW_LENGTH', width/2, 0);
//		, {
//		xScaleFactor: 0.2,
//		yScaleFactor:0.2,
//		containerWidth: width,
//		containerHeight: height,
//		position: {
//		mx: 0.5,
//		my: 0
//		}
//		});

		drawPath(p, pathData, {
			strokeWidth: 2,
			fill: 'none'
		});

		return window;
	};

	this.getCirclePath = function(shape) {
		var cx = shape.x + shape.width / 2,
		cy = shape.y + shape.height / 2,
		radius = shape.width / 2;

		var circlePath = [
		                  ['M', cx, cy],
		                  ['m', 0, -radius],
		                  ['a', radius, radius, 0, 1, 1, 0, 2 * radius],
		                  ['a', radius, radius, 0, 1, 1, 0, -2 * radius],
		                  ['z']
		                  ];

		return componentsToPath(circlePath);
	};

	this.getRectPath = function(shape) {

		var width = shape.width,
		height = shape.height,
		x = shape.x,
		y = shape.y,
		quarterWidth = width / 4,
		quarterHeight = height / 4;

		var rectPath = [
		                ['M', x, y],
		                ['l', width, 0],
		                ['l', 0, height],
		                ['l', -width, 0],
		                ['z']
		                ];

		return componentsToPath(rectPath);
	}

	this.getOctagonPath = function(shape) {

		var width = shape.width,
		height = shape.height,
		x = shape.x,
		y = shape.y,
		quarterWidth = width / 4,
		quarterHeight = height / 4;

		var octagonPath = [
		                   ['M', x + quarterWidth, y],
		                   ['l', quarterWidth*2, 0],
		                   ['l', quarterWidth, quarterHeight],
		                   ['l', 0, quarterHeight*2],
		                   ['l', -quarterWidth, quarterHeight],
		                   ['l', -quarterWidth*2, 0],
		                   ['l', -quarterWidth, -quarterHeight],
		                   ['l', 0, -quarterHeight*2],
		                   ['z']
		                   ];

		return componentsToPath(octagonPath);
	}

	function renderLabel(p, label, options) {
		return textUtil.createText(p, label || '', options).addClass('djs-label');
	}

	function renderExternalLabel(p, element, align) {
		var semantic = element.businessObject;

		if (!semantic.name) {
			element.hidden = true;
		}

		return renderLabel(p, semantic.name, { box: element, align: align, style: { fontSize: '11px' } });
	}

	function addLabel(element) {
		var bounds = {
				width: 100,
				height: 50,
				x: element.x - 40,
				y: element.y + element.height
		};

		var label = ElementFactory.createLabel({
			id: element.id + '_label',
			labelTarget: element,
			type: 'label',
			hidden: element.hidden,
			x: Math.round(bounds.x),
			y: Math.round(bounds.y),
			width: Math.round(bounds.width),
			height: Math.round(bounds.height)
		});

		return canvas.addShape(label, element.parent);
	};

	function createPathFromConnection(connection) {
		var waypoints = connection.waypoints;

		var pathData = 'm  ' + waypoints[0].x + ',' + waypoints[0].y;
		for (var i = 1; i < waypoints.length; i++) {
			pathData += 'L' + waypoints[i].x + ',' + waypoints[i].y + ' ';
		}
		return pathData;
	}
	
	  eventBus.on('canvas.init', function(event) {
		    initMarkers(event.svg);
		  });
}

inherits(CustomRenderer, BaseRenderer);

module.exports = CustomRenderer;

CustomRenderer.$inject = [ 'eventBus', 'styles', 'customPathMap', 'elementFactory', 'canvas' ];


CustomRenderer.prototype.canRender = function(element) {
	return /^custom\:/.test(element.type);
};

CustomRenderer.prototype.drawShape = function(visuals, element) {
	var type = element.type;
	var h = this.handlers[type];

	/* jshint -W040 */
	return h(visuals, element);
};

CustomRenderer.prototype.drawConnection = function(visuals, element) {
	var type = element.type;
	var h = this.handlers[type];

	/* jshint -W040 */
	return h(visuals, element);
};

CustomRenderer.prototype.getShapePath = function(element) {
	var type = element.type.replace(/^custom\:/, '');

	var shapes = {
			InputEvent: this.getCirclePath,
			OutputEvent: this.getCirclePath,
			ConjunctionOperator: this.getOctagonPath,
			DisjunctionOperator: this.getOctagonPath,
			NegationOperator: this.getOctagonPath,
			Interval: this.getRectPath,
			Window: this.getRectPath,
			TimeWindow: this.getRectPath,
			LengthWindow: this.getRectPath
	};

	return shapes[type](element);
};
