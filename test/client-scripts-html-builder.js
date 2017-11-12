const expect = require('chai').expect;
require('chai').should();
const _ = require('underscore');
const assert = require('assert');
const jsdom = require('mocha-jsdom');
const dom = require('../minimojs/client/dom.js');
const htmlBuilder = require('../minimojs/client/html-builder.js');
const comp = require('../minimojs/components.js');
const resources = require('../minimojs/resources.js');
const startComponents = comp.startComponents;

let createComponentCtx;

jsdom({
    skipWindowCheck: true
});

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
            createComponentCtx = eval(`${script};createComponentContext`);
        })));

describe('Client scripts - html-builder.js', () => {
    it('Simple builder', () => {
        document.body.innerHTML = `
            <html>
                <body></body>
            </html>
        `;
        const json = {
            "n": "div",
            "c": [{
                "n": "div",
                "a": {
                    "class": "cl1 cl2",
                    "id": "d1"
                }
            }, {
                "n": "script",
                "a": {
                    "id": "s1",
                    "src": "/test.js"
                }
            }]
        };
        const insertPoint = document.body;
        const minimo = {
            eval: function (s) {
                return eval(s);
            }
        }
        const domObj = new dom.DOM(minimo, document.body, document);
        const builder = new htmlBuilder.HtmlBuilder(minimo, domObj, {});
        return builder.createElements(json, insertPoint)
            .then(updater => {
                document.getElementById("d1").getAttribute("class").should.eq("cl1 cl2");
                document.getElementById("s1").getAttribute("src").should.eq("/test.js");
            })
    });

    it('Dyn attrib builder', () => {
        document.body.innerHTML = `
            <html>
                <body></body>
            </html>
        `;
        const json = {
            "n": "div",
            "a": {
                "checked": [{
                    s: "true"
                }]
            },
            "c": [{
                "n": "div",
                "a": {
                    "id": [
                        "ID_",
                        {
                            s: "obj.id + 1"
                        }
                    ]
                }
            }, {
                "n": "script",
                "a": {
                    "src": "/test.js"
                }
            }]
        };
        const insertPoint = document.body;
        const minimo = {
            eval: function (s) {
                const obj = {
                    id: 1
                }
                return eval(s);
            }
        }
        const domObj = new dom.DOM(minimo, document.body, document);
        const builder = new htmlBuilder.HtmlBuilder(minimo, domObj, {});
        return builder.createElements(json, insertPoint)
            .then(updater => {
                updater.updateAttributes();
                expect(document.getElementById("ID_2")).not.be.null;
            })
    });

    it('Simple component', () => {
        document.body.innerHTML = `
            <html>
                <body></body>
            </html>
        `;
        const json = {
            "n": "div",
            "a": {
                "checked": [{
                    s: "true"
                }]
            },
            "c": [{
                "ci": "id_258809",
                "cn": "htmxstyle.wrapper",
                "ip": {},
                "c": [{
                    "n": "span",
                    "a": {
                        "id": "sp"
                    },
                    "c": [{
                        "t": "spanvalue"
                    }]
                }]
            }]
        };
        const insertPoint = document.body;
        const minimo = {
            eval: function (s) {}
        }
        const domObj = new dom.DOM(minimo, document.body, document);
        const builder = new htmlBuilder.HtmlBuilder(minimo, domObj, createComponentCtx);
        return builder.createElements(json, insertPoint)
            .then(updater => {
                updater.updateAttributes();
                expect(document.getElementById("sp")).not.be.null;
                document.getElementById("sp").innerHTML.should.eq("spanvalue");
            })
    });

    it('Component with html attribute', () => {
        document.body.innerHTML = `
            <html>
                <body></body>
            </html>
        `;
        const json = {
            "ci": "id_258809",
            "cn": "htmxstyle.wrapper_html_attribute",
            "ip": {
                "id": "wid",
                "innerattribute": {
                    "test": [{
                        "s": "this.id"
                    }, "_test"],
                    "content": [{
                        "n": "span",
                        "a": {
                            "id": "sp"
                        },
                        "c": [{
                            "x": "this.innerattribute.test"
                        }]
                    }, {
                        "t": " - "
                    }, {
                        "x": "obj.id"
                    }]
                }
            },
            "c": [{
                "n": "div",
                "a": {
                    "id": [{
                        "s": "this.id"
                    }]
                },
                "c": [{
                    "x": "this.innerattribute.test"
                }, {
                    "t": ": "
                }, {
                    "x": "this.innerattribute.content"
                }]
            }]
        };
        const insertPoint = document.body;
        const obj = {
            id: 'pageobj'
        }
        const minimo = {
            eval: function (s) {
                return eval(s);
            }
        }
        const domObj = new dom.DOM(minimo, document.body, document);
        const builder = new htmlBuilder.HtmlBuilder(minimo, domObj, createComponentCtx);
        return builder.createElements(json, insertPoint)
            .then(updater => {
                updater.updateAttributes();
                updater.updateMScripts();
                expect(document.getElementById("wid_test")).not.be.null;
                document.getElementById("sp").innerHTML.should.eq("spanvalue");
            })
    });
});