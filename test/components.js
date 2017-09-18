require('./test');
require('chai').should();
const expect = require('chai').expect;
const _ = require('underscore');
const assert = require('assert');
const components = require('../minimojs/components');
const ctx = require('../minimojs/context');

describe('Test component', function() {
  it('Load components', () => {
    ctx.contextPath = 'ctx';
    return components.loadComponents()
      .then(components => {
        // console.log(components.scripts);
        var varComp;
        try{
          eval(`
            var X = {generatedId: function(){return '123'}, _addExecuteWhenReady: function(){}};
            ${components.scripts}
            varComp = components;
          `);
        }catch(e){
          console.log(`Error: ${e.message}`);
        }
        expect(varComp.oldtype.old.getHtml()).is.equal('/ctx<input type="text">');
      });
  });
});