require('./test');
const chai = require('chai');
const rewire = require('rewire');
chai.use(require('chai-string'));
chai.should();
const expect = require('chai').expect;
const _ = require('underscore');
const assert = require('assert');
const startComponents = require('../minimojs/components').startComponents;
const componentTypes = require('../minimojs/component-types');
const _childInfoHtmxFormat = require('../minimojs/components')._childInfoHtmxFormat;
const _findDeepestComponent = require('../minimojs/components')._findDeepestComponent;
const buildComponentsOnPage = require('../minimojs/components').buildComponentsOnPage;
const _setUpGetterForAttributes = require('../minimojs/components').getSetUpGetterForAttributesScript()
const loadComponents = require('../minimojs/components').loadComponents;
const ctx = require('../minimojs/context');
const _components = rewire('../minimojs/components');
const htmlParser = require('../minimojs/htmlParser');
const util = require('../minimojs/util');
const resources = require('../minimojs/resources');

process.chdir(`${__dirname}/datadir`);

let components;
let info;
let _setComponents = (c, i) => {
	components = c;
	info = i;
}

before(() => loadComponents().then(c => resources.readModuleFile('../minimojs/component-types.js').then((componentTypes) => {
		var _test = {};
		try{
			eval(`
				var __types = (function(){
					var module = {};
					${componentTypes}
					return module.exports;
				})();
				${_setUpGetterForAttributes}
        var m = {generatedId: function(){return '123'}, _addExecuteWhenReady: function(){}};
        ${c.scripts}
        _test.components = components;`);
		} catch (e) {
			console.log(`Error: ${e.message}`);
		}
		_setComponents(_test.components, c);
	})));


describe('Test component', function () {
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
								<htmxstyle.checkbox id="cb_\${index}" varToBind="obj.val" label="Label">
									<htmxstyle.checkbox id="cb_\${index}" varToBind="obj.val" label="Label2">
										<htmxstyle.checkbox id="cb_\${index}" varToBind="obj.val" label="OK"/>
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
	it('buildComponentsOnpage', () =>
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

			const json = doc.toJson();
			const wrapper = json.c[0].c[1].c[0];
			wrapper.cn.should.equal('htmxstyle.wrapper');
			wrapper.c[0].n.should.equal('div');
			wrapper.c[0].a.test[0].should.equal('1');

			wrapper.c[0].a.test[0].should.equal('1');
			wrapper.c[0].c[1].n.should.equal('div');
			wrapper.c[0].c[1].c[0].c[0].cn.should.equal('htmxstyle.checkbox');

			wrapper.c[0].c[1].c[1].cn.should.equal('htmxstyle.actiontable');
		}));
	it('Actiontable', () => {
		info.htmxSources["components['htmxstyle']['actiontable']"].should.startWith('<table');
	});
});