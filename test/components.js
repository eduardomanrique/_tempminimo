require('./test');
const chai = require('chai');
chai.use(require('chai-string'));
require('chai').should();
const expect = require('chai').expect;
const _ = require('underscore');
const assert = require('assert');
const loadComponents = require('../minimojs/components').loadComponents;
const ctx = require('../minimojs/context');

ctx.contextPath = 'ctx';
process.chdir(`${__dirname}/datadir`);

let components;
let info;
let _setComponents = (c, i) => {
	components = c;
  info = i;
}

before(() =>
	loadComponents()
      .then(c => {
        var _test = {};
        try{
          eval(`
            var X = {generatedId: function(){return '123'}, _addExecuteWhenReady: function(){}};
            ${c.scripts}
            _test.components = components;
          `);
        }catch(e){
          console.log(`Error: ${e.message}`);
        }
		    _setComponents(_test.components, c);
      })
);

describe('Test component', function() {
  it('Old type', () => {
    expect(components.oldtype.old.getHtml()).is.equal('/ctx<input type="text">');
	  // expect(components.oldtype.old.method1()).is.equal('method1');
    // expect(components.oldtype.old.method2()).is.equal('method2');
		// expect(_test.components.actiontable.getHtml()).is.equal('/ctx<input type="text">'););
  });
  it('Actiontable', () => {
	  var listVal = [{
	  	id: 1,
	  	name: 'One'
	  },{
	  	id: 2,
	  	name: 'Two'
	  }];
	  let attrs = {
	  	id: "at",
	  	column: [{
	  		"title": "t1",
	  		"content": "<b>${v.id}"
	  	},{
	  		"title": "t2",
	  		"content": "<b>${v.name}"
	  	}],
	  	list: "listVal"
	  };
    function _evalFn(f){
      try{
        return eval(f);
      }catch(e){
        throw new Error('Error executing script component ' + this._compName + '. Script: ' + f + '. Cause: ' + e.message);
      }
    };
    var instance = new components.actiontable.htmxContext(attrs, _evalFn);
	  expect(instance._compName).is.equal('actiontable');
	  expect(instance._compName).is.equal('actiontable');
	  instance.list = instance._xcompEval(attrs.list);
	  expect(instance.list).to.have.lengthOf(2);
	  instance.remove(0);
	  expect(instance.list).to.have.lengthOf(1);
	  expect(instance.list[0].id).is.equal(2);
    info.htmxSources["components['actiontable']"].should.startWith('<table');
  });

});