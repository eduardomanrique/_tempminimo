const expect = require('chai').expect;
require('chai').should();
const _ = require('underscore');
const assert = require('assert');
const jsdom = require('mocha-jsdom');
const dom = require('../minimojs/client/dom.js');
const virtualDom = require('../minimojs/client/vdom/virtualdom');
const comp = require('../minimojs/components.js');
const resources = require('../minimojs/resources.js');
const htmlParser = require('../minimojs/htmlparser');
const startComponents = comp.startComponents;

let buildComponentBuilderFunction;

jsdom({
    skipWindowCheck: true
});

const _createEvent = (name) => {
    const e = document.createEvent('Event');
    e.initEvent(name, true, true);
    return e;
}

const m = {
    generateId: () => 1,
    _addExecuteWhenReady: () => {}
}

before(() => startComponents()
    .then(c => resources.readModuleFile('../minimojs/client/components.js')
        .then((clientComponents) => {
            const script = clientComponents
                .replace('"%components%"', comp.getScripts())
                .replace('"%component-types%"', comp.getComponentTypes())
                .replace('"%__setUpGetterForAttributes%"', comp.getSetUpGetterForAttributesScript());
            buildComponentBuilderFunction = eval(`${script};buildComponentBuilderFunction`);
        })));

describe('Client screen events', () => {
    it('Simple event', () => {
        document.body.innerHTML = `
            <html>
                <body></body>
            </html>
        `;
        let parser = new htmlParser.HTMLParser();
        let doc = parser.parse(`
            $when.alert(param, opt) {
                <div id="msg">\${param}</div>
                <button onclick="opt.consume()" id="btnConsume">btn</button>
            }
            <button onclick="emit()" id="btnEmit">emit</button>
        `);
        const json = doc.toJson().c;
        const insertPoint = document.body;
        const minimo = Minimo.builder()
            .withInsertPoint(document.body)
            .withHtmlStruct(json)
            .withController(function (m) {
                const value = 'value';
                const $issue = m.issue;
                this.eval = function (s) {
                    return eval(s);
                }

                function emit() {
                    $issue.alert(value).publish();
                }
                this.__eval__ = (f) => {
                    return eval(f);
                };
            }).build();
        const vdom = new virtualDom.VirtualDom(json, insertPoint, null, null, minimo, false, buildComponentBuilderFunction);
        vdom._defaultUpdateDelay = 0;
        return vdom.build()
            .then(() => {
                //console.log(document.body.innerHTML)
                document.getElementById("btnEmit").dispatchEvent(_createEvent('click'));
                return vdom.update().then(() => new Promise(r => {
                    setTimeout(() => {
                        expect(document.getElementById('msg')).not.to.be.null;
                        document.getElementById('msg').innerHTML.trim().should.be.eq('value');
                        document.getElementById("btnConsume").dispatchEvent(_createEvent('click'));
                        vdom.update().then(() => {
                            setTimeout(() => {
                                expect(document.getElementById('msg')).to.be.null;
                                r();
                            }, 100);
                        });
                    }, 100);
                }));
            })
    });

    it('Simple event with answer', () => {
        document.body.innerHTML = `
            <html>
                <body></body>
            </html>
        `;
        let parser = new htmlParser.HTMLParser();
        let doc = parser.parse(`
            $when.ask(param, opt) {
                <button onclick="opt.yes()" id="btnYes">yes</button>
                <button onclick="opt.no()" id="btnNo">no</button>
            }
            <div id="msg">\${value}</div>
            <button onclick="emit()" id="btnEmit">emit</button>
        `);
        const json = doc.toJson().c;
        const insertPoint = document.body;
        const minimo = Minimo.builder()
            .withInsertPoint(document.body)
            .withHtmlStruct(json)
            .withController(function (m) {
                let value = '';
                const $issue = m.issue;
                this.eval = function (s) {
                    return eval(s);
                }

                function emit() {
                    var v = $issue.ask(value)
                        .yes(() => value = 'yes')
                        .no(() => value = 'no')
                        .publish();
                }
                this.__eval__ = (f) => {
                    return eval(f);
                };
            }).build();
        const vdom = new virtualDom.VirtualDom(json, insertPoint, null, null, minimo, false, buildComponentBuilderFunction);
        vdom._defaultUpdateDelay = 0;
        return vdom.build()
            .then(async() => {
                //console.log(document.body.innerHTML)
                document.getElementById("btnEmit").dispatchEvent(_createEvent('click'));
                await vdom.update();
                await new Promise(r => setTimeout(() => {
                    expect(document.getElementById('btnYes')).not.to.be.null;
                    expect(document.getElementById('btnNo')).not.to.be.null;
                    document.getElementById('msg').innerHTML.trim().should.eq('');
                    document.getElementById("btnYes").dispatchEvent(_createEvent('click'));
                    r();
                }, 100));
                await vdom.update();
                await new Promise(r => setTimeout(() => {
                    expect(document.getElementById('btnYes')).to.be.null;
                    expect(document.getElementById('btnNo')).to.be.null;
                    document.getElementById('msg').innerHTML.trim().should.eq('yes');
                    document.getElementById("btnEmit").dispatchEvent(_createEvent('click'));
                    r();
                }, 100));
                await vdom.update();
                await new Promise(r => setTimeout(() => {
                    expect(document.getElementById('btnYes')).not.to.be.null;
                    expect(document.getElementById('btnNo')).not.to.be.null;
                    document.getElementById("btnNo").dispatchEvent(_createEvent('click'));
                    r();
                }, 100));
                await vdom.update();
                await new Promise(r => setTimeout(() => {
                    expect(document.getElementById('btnYes')).to.be.null;
                    expect(document.getElementById('btnNo')).to.be.null;
                    document.getElementById('msg').innerHTML.trim().should.eq('no');
                    r();
                }, 100));
            })
    });
});