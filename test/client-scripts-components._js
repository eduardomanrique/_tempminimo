const expect = require('chai').expect;
require('chai').should();
const _ = require('underscore');
const assert = require('assert');
const jsdom = require('mocha-jsdom');
const comp = require('../minimojs/components.js');
const resources = require('../minimojs/resources.js');
const startComponents = comp.startComponents;
let createComponentCtx;

const m = {
    generateId: () => 1,
    _addExecuteWhenReady: () => {}
}

before(() => startComponents()
    .then(c => resources.readModuleFile('../minimojs/client/components.js')
        .then((clientComponents) => {
            const script = clientComponents
                .replace("'%components%'", comp.getScripts())
                .replace("'%component-types%'", comp.getComponentTypes())
                .replace("'%__setUpGetterForAttributes%'", comp.getSetUpGetterForAttributesScript());
            createComponentCtx = eval(`${script};buildComponentBuilderFunction`);
        })));

describe('Client scripts - components.js', () => {
    it('buildComponentBuilderFunction', () => {
        const m = new function () {
            var obj = {
                id: 1234
            };
            var listVal = [{
                id: 1,
                name: 'One'
            }, {
                id: 2,
                name: 'Two'
            }];
            this.eval = function (s) {
                return eval(s);
            }
        }
        const info = {
            cn: 'htmxstyle.actiontable',
            ip: {
                id: ["at", {
                    s: "1+1"
                }],
                column: [{
                    "title": "t1",
                    "content": "<b>${v.id}"
                }, {
                    "title": "t2",
                    "content": "<b>${v.name}"
                }],
                list: "listVal"
            }
        };
        const instance = createComponentCtx(info, m);
        instance.list.should.have.lengthOf(2);
        instance.id.should.eq('at2');
        instance._compName.should.equal('htmxstyle.actiontable');
		instance.remove(0);
		instance.list.should.have.lengthOf(1);
		m.eval('listVal').should.have.lengthOf(1);
    });
});