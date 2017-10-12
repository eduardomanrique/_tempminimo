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
const _findDeepestComponent = require('../minimojs/components')._findDeepestComponent;
const buildComponentsOnPage = require('../minimojs/components').buildComponentsOnPage;
const setUpGetterForAttributes = require('../minimojs/components').setUpGetterForAttributes
const loadComponents = require('../minimojs/components').loadComponents;
const ctx = require('../minimojs/context');
const _components = rewire('../minimojs/components');
const htmlParser = require('../minimojs/htmlParser');
const util = require('../minimojs/util');

ctx.contextPath = 'ctx';
process.chdir(`${__dirname}/datadir`);

let components;
let info;
let _setComponents = (c, i) => {
	components = c;
	info = i;
}

before(() => loadComponents().then(c => util.readModuleFile('../minimojs/component-types.js').then((componentTypes) => {
		var _test = {};
		try{
			eval(`
				var __types = (function(){
					var module = {};
					${componentTypes}
					return module.exports;
				})();
				${setUpGetterForAttributes}
        var X = {generatedId: function(){return '123'}, _addExecuteWhenReady: function(){}};
        ${c.scripts}
        _test.components = components;`);
		} catch (e) {
			console.log(`Error: ${e.message}`);
		}
		_setComponents(_test.components, c);
	})));


describe('Test component', function () {
	it('Old type', () => {
		expect(components.oldtype.getHtml()).is.equal('/ctx<input type="text">');
		// expect(components.oldtype.method1()).is.equal('method1');
		// expect(components.oldtype.method2()).is.equal('method2');
	});
	it('Actiontable', () => {
		var listVal = [{
			id: 1,
			name: 'One'
		}, {
			id: 2,
			name: 'Two'
		}];
		let attrs = {
			id: "at",
			column: [{
				"title": "t1",
				"content": "<b>${v.id}"
			}, {
				"title": "t2",
				"content": "<b>${v.name}"
			}],
			list: "listVal"
		};

		function _evalFn(f) {
			try {
				return eval(f);
			} catch (e) {
				throw new Error('Error executing script component ' + this._compName + '. Script: ' + f + '. Cause: ' + e.message);
			}
		};
		var instance = new components.htmxstyle.actiontable.htmxContext(attrs, _evalFn);
		instance._compName.should.equal('htmxstyle.actiontable');
		instance.list = instance._xcompEval(attrs.list);
		instance.list.should.have.lengthOf(2);
		instance.remove(0);
		instance.list.should.have.lengthOf(1);
		instance.list[0].id.should.equal(2);
		info.htmxSources["components['htmxstyle']['actiontable']"].should.startWith('<table');
	});
	it('_childInfoHtmxFormat', () =>
		startComponents().then(() => {
			const doc = new htmlParser.HTMLParser().parse(
				`<htmxstyle.actiontable list="tbList" id="tb" v="bindV">
					<column><b>index</b></column>
					<column title="Name \${index}"><br>item.data.name</column>
					<column title="Gender">item.data.gender.name</column>
					<column title="Like movies?">item.likeMovies ? 'Yes' : 'No'</column>
				</htmxstyle.actiontable>`);
			const [info, boundVars] = _childInfoHtmxFormat('components.htmxstyle.actiontable', _.first(doc.getElementsByName('htmxstyle.actiontable')));
			info.id[0].should.equal('tb');
			info.column.should.have.lengthOf(4);
			info.column[0].title[0].should.equal("None");
			info.column[1].title[0].should.equal("Name ");
			info.column[1].title[1].s.should.equal("index");
			info.column[2].title[0].should.equal("Gender");
			info.column[3].title[0].should.equal("Like movies?");

			info.column[0].content[0].n.should.equal("b");
			info.column[0].content.should.have.lengthOf(1);
			info.column[0].content[0].c.should.have.lengthOf(1);
			info.column[0].content[0].c[0].should.equal("index");

			info.column[1].content.should.have.lengthOf(2);

			boundVars.v.should.equal('bindV');
		}));
	it('_findDeepestComponent', () =>
		startComponents().then(() => {
			const doc = new htmlParser.HTMLParser().parse(
				`<html>
					<head></head>
					<body>
						<htmxstyle.actiontable list="tbList" id="tb" v="bindV">
							<column><b>index</b></column>
							<column title="Name"><br>item.data.name</column>
							<column title="Gender">item.data.gender.name</column>
							<column title="Like movies?">item.likeMovies ? 'Yes' : 'No'</column>
							<column>
								<htmxstyle.checkbox id="cb_\${index}" bind="obj.val" label="Label">
									<htmxstyle.checkbox id="cb_\${index}" bind="obj.val" label="Label2">
										<htmxstyle.checkbox id="cb_\${index}" bind="obj.val" label="OK"/>
										</htmxstyle.checkbox>
								</htmxstyle.checkbox>
							</column>
						</htmxstyle.actiontable>
					</body>
				</html>`);

			const [element, component] = _findDeepestComponent(doc).value;
			element.name.should.equal('htmxstyle.checkbox');
			element.getAttribute('label').should.equal('OK');
			component.resourceName.should.equal('htmxstyle.checkbox');
		}));
	it('buildComponentOnpage', () =>
		startComponents().then(() => {
			const doc = new htmlParser.HTMLParser().parse(
				`<html>
					<head></head>
					<body>
						<htmxstyle.wrapper>
							<b><htmxstyle.checkbox id="cb" varToBind="obj.val" label="Label"/></b>
							<htmxstyle.actiontable list="tbList" id="tb" v="bindV">
								<column><b>index</b></column>
								<column title="Name"><br>item.data.name</column>
								<column title="Gender">item.data.gender.name</column>
								<column title="Like movies?">item.likeMovies ? 'Yes' : 'No'</column>
								<column><htmxstyle.checkbox id="cb_\${index}" varToBind="obj.val" label="Label"/></column>
							</htmxstyle.actiontable>
						</htmxstyle.wrapper>
					</body>
				</html>`);
			const boundVars = [];
			const boundModals = [];
			buildComponentsOnPage(doc, boundVars, boundModals);
			console.log(JSON.stringify(doc.toJson()));
			//TODO falta colocar o context, e deixar tudo como script
			//checkbox must have bind=obj.val after compiled
		}));
});