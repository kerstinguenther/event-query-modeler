module.exports = {
  __init__: [ 'customRenderer', 'paletteProvider', 'customRules', 'customUpdater', 'customPathMap', 'customContextPadProvider', /*'customModeling'*/ ],
  elementFactory: [ 'type', require('./CustomElementFactory') ],
  customRenderer: [ 'type', require('./CustomRenderer') ],
  paletteProvider: [ 'type', require('./CustomPalette') ],
  customRules: [ 'type', require('./CustomRules') ],
  customUpdater: [ 'type', require('./CustomUpdater') ],
  customPathMap: [ 'type', require('./CustomPathMap') ],
  customContextPadProvider: [ 'type', require('./CustomContextPadProvider') ],
  //customModeling: [ 'type', require('./CustomModeling') ]
};