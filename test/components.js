require('./test');
const chai = require('chai');
const rewire = require('rewire');
chai.use(require('chai-string'));
require('chai').should();
const expect = require('chai').expect;
const _ = require('underscore');
const assert = require('assert');
const startComponents = require('../minimojs/components').startComponents;
const _childInfoHtmxFormat = require('../minimojs/components')._childInfoHtmxFormat;
const loadComponents = require('../minimojs/components').loadComponents;
const ctx = require('../minimojs/context');
const _components = rewire('../minimojs/components');
const htmlParser = require('../minimojs/htmlParser');

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
    expect(components.oldtype.getHtml()).is.equal('/ctx<input type="text">');
	  // expect(components.oldtype.method1()).is.equal('method1');
    // expect(components.oldtype.method2()).is.equal('method2');
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
    var instance = new components.htmxstyle.actiontable.htmxContext(attrs, _evalFn);
	  expect(instance._compName).is.equal('htmxstyle.actiontable');
	  instance.list = instance._xcompEval(attrs.list);
	  expect(instance.list).to.have.lengthOf(2);
	  instance.remove(0);
	  expect(instance.list).to.have.lengthOf(1);
	  expect(instance.list[0].id).is.equal(2);
    info.htmxSources["components['htmxstyle']['actiontable']"].should.startWith('<table');
  });
	it('_childInfoHtmxFormat', () =>
		startComponents().then(() => {
			const doc = new htmlParser.HTMLParser().parse(
				`<htmxstyle.actiontable list="tbList" id="tb">
					<column title="">index</column>
					<column title="Name">item.data.name</column>
					<column title="Gender">item.data.gender.name</column>
					<column title="Like movies?">item.likeMovies ? 'Yes' : 'No'</column>
				</htmxstyle.actiontable>`);
			const info = _childInfoHtmxFormat('htmxstyle.actiontable', _.first(doc.getElementsByName('htmxstyle.actiontable')));
			console.log(JSON.stringify(info));
		}))
});

    //
		//_prepareDefinedAttributes: element.innerHTML()?
		//buildComponentOnpage