const expect = require('chai').expect;
require('chai').should();
const _ = require('underscore');
const assert = require('assert');
const jsdom = require('mocha-jsdom');
const dom = require('../minimojs/client/dom.js');
const virtualDom = require('../minimojs/client/vdom/virtualdom');
const comp = require('../minimojs/components.js');
const resources = require('../minimojs/resources.js');
const startComponents = comp.startComponents;

let buildComponentBuilderFunction;

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
            buildComponentBuilderFunction = eval(`${script};buildComponentBuilderFunction`);
        })));

describe('Client scripts - virtualdom.js', () => {
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
        const virtualDomManager = new virtualDom.VirtualDomManager(minimo, domObj, buildComponentBuilderFunction);
        return virtualDomManager.build(json, insertPoint)
            .then(vdom => {
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
                "id": "checkedDiv",
                "checked": [{
                    s: "obj.isChecked"
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
        const minimo = new function () {
            const obj = {
                id: 1,
                isChecked: true
            }
            this._obj = obj;
            this.eval = function (s) {
                return eval(s);
            }
        }
        const domObj = new dom.DOM(minimo, document.body, document);
        const virtualDomManager = new virtualDom.VirtualDomManager(minimo, domObj, buildComponentBuilderFunction);
        return virtualDomManager.build(json, insertPoint)
            .then(vdom => {
                vdom.update();
                expect(document.getElementById("ID_2")).not.be.null;
                document.getElementById("checkedDiv").getAttribute("checked").should.eq("true");
                minimo._obj.isChecked = false;
                minimo._obj.id = 2;
                // console.log(document.body.innerHTML);
                vdom.update();
                expect(document.getElementById("ID_3")).not.be.null;
                expect(document.getElementById("ID_2")).to.be.null;
                document.getElementById("checkedDiv").getAttribute("checked").should.eq("false");
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
        const virtualDomManager = new virtualDom.VirtualDomManager(minimo, domObj, buildComponentBuilderFunction);
        return virtualDomManager.build(json, insertPoint)
            .then(vdom => {
                vdom.update();
                expect(document.getElementById("sp")).not.be.null;
                document.getElementById("sp").innerHTML.should.eq("spanvalue");
            })
    });


    it('If', () => {
        document.body.innerHTML = `
            <html>
                <body></body>
            </html>
        `;
        const json = {
            "n": "div",
            "a": {
                "id": "d1"
            },
            "c": [{
                "xc": "a == 'show'",
                "c": [{
                    "t": "showing"
                }]
            }]
        };
        const insertPoint = document.body;
        const minimo = new function () {
            var a = 'hide';
            this.eval = function (s) {
                return eval(s);
            }
            this.setA = function (v) {
                a = v;
            }
        }
        const domObj = new dom.DOM(minimo, document.body, document);
        const virtualDomManager = new virtualDom.VirtualDomManager(minimo, domObj, buildComponentBuilderFunction);
        return virtualDomManager.build(json, insertPoint)
            .then(vdom => {
                vdom.update();
                const d1 = document.getElementById("d1");
                d1.innerHTML.should.be.eq("");
                minimo.setA("show");
                vdom.update();
                d1.innerHTML.should.be.eq("showing");
            })
    });

    it('If', () => {
        document.body.innerHTML = `
            <html>
                <body></body>
            </html>
        `;
        const json = {
            "n": "div",
            "a": {
                "id": "d1"
            },
            "c": [{
                "xc": "a == 'show'",
                "c": [{
                    "t": "showing"
                }]
            }]
        };
        const insertPoint = document.body;
        const minimo = new function () {
            var a = 'hide';
            this.eval = function (s) {
                return eval(s);
            }
            this.setA = function (v) {
                a = v;
            }
        }
        const domObj = new dom.DOM(minimo, document.body, document);
        const virtualDomManager = new virtualDom.VirtualDomManager(minimo, domObj, buildComponentBuilderFunction);
        return virtualDomManager.build(json, insertPoint)
            .then(vdom => {
                vdom.update();
                const d1 = document.getElementById("d1");
                d1.innerHTML.should.be.eq("");
                minimo.setA("show");
                vdom.update();
                d1.innerHTML.should.be.eq("showing");
            })
    });

    it('Nested If', () => {
        document.body.innerHTML = `
            <html>
                <body></body>
            </html>
        `;
        const json = {
            "n": "div",
            "a": {
                "id": "d1"
            },
            "c": [{
                "xc": "a == 'show'",
                "c": [{
                    "xc": "b == 'show'",
                    "c": [{
                        "t": "showing"
                    }]
                }]
            }]
        };
        const insertPoint = document.body;
        const minimo = new function () {
            var a = 'hide';
            var b = 'hide';
            this.eval = function (s) {
                return eval(s);
            }
            this.setA = function (v) {
                a = v;
            }
            this.setB = function (v) {
                b = v;
            }
        }
        const domObj = new dom.DOM(minimo, document.body, document);
        const virtualDomManager = new virtualDom.VirtualDomManager(minimo, domObj, buildComponentBuilderFunction);
        return virtualDomManager.build(json, insertPoint)
            .then(vdom => {
                vdom.update();
                const d1 = document.getElementById("d1");
                d1.innerHTML.should.be.eq("");
                minimo.setA("show");
                vdom.update();
                d1.innerHTML.should.be.eq("");
                minimo.setB("show");
                vdom.update();
                d1.innerHTML.should.be.eq("showing");
                minimo.setA("hide");
                vdom.update();
                d1.innerHTML.should.be.eq("");
            })
    });
    it('Iterator', () => {
        document.body.innerHTML = `
            <html>
                <body></body>
            </html>
        `;
        const json = {
            "n": "div",
            "a": {
                "id": "d1"
            },
            "c": [{
                "xl": "objList",
                "xv": "item",
                "xi": "index",
                "c": [{
                    "t": "item:"
                }, {
                    "x": "JSON.stringify(item)"
                }, {
                    "t": ", index:"
                }, {
                    "x": "index+1"
                }, {
                    "t": ", "
                }]
            }]
        };
        const insertPoint = document.body;
        const minimo = new function () {
            var objList = [{
                id: 1,
                text: "One"
            }, {
                id: 2,
                text: "Two"
            }];
            this.eval = function (s) {
                return eval(s);
            }
            this.add = function (item, index) {
                objList.splice(index, 0, item);
            }
            this.remove = function (i) {
                objList.splice(i, 1);
            }
            this.getItem = function (i) {
                return objList[i];
            }
        }
        const domObj = new dom.DOM(minimo, document.body, document);
        const virtualDomManager = new virtualDom.VirtualDomManager(minimo, domObj, buildComponentBuilderFunction);
        return virtualDomManager.build(json, insertPoint)
            .then(vdom => {
                vdom.update();
                const d1 = document.getElementById("d1");
                d1.innerHTML.should.be.eq('item:{"id":1,"text":"One"}, index:1, item:{"id":2,"text":"Two"}, index:2, ');
                minimo.add({
                    added: "New"
                }, 1);
                minimo.getItem(2).id = 1000;
                minimo.getItem(2).text = "1000";
                vdom.update();
                d1.innerHTML.should.be.eq('item:{"id":1,"text":"One"}, index:1, item:{"added":"New"}, index:2, item:{"id":1000,"text":"1000"}, index:3, ');
                minimo.remove(0);
                vdom.update();
                d1.innerHTML.should.be.eq('item:{"added":"New"}, index:1, item:{"id":1000,"text":"1000"}, index:2, ');
                minimo.remove(1);
                vdom.update();
                d1.innerHTML.should.be.eq('item:{"added":"New"}, index:1, ');
                minimo.remove(0);
                vdom.update();
                d1.innerHTML.should.be.eq('');
                minimo.add({
                    added: "New"
                }, 1);
                vdom.update();
                d1.innerHTML.should.be.eq('item:{"added":"New"}, index:1, ');
            })
    });
    it('Nested Iterator', () => {
        document.body.innerHTML = `
            <html>
                <body></body>
            </html>
        `;
        const json = {
            "n": "div",
            "a": {
                "id": "d1"
            },
            "c": [{
                "xl": "objList",
                "xv": "item",
                "xi": "ixx",
                "c": [{
                    "t": "item:"
                }, {
                    "x": "item.text"
                }, {
                    "xc": "item.values.length > 0",
                    "c": [{
                        "t": ", values:"
                    }, {
                        "xl": "item.values",
                        "xv": "item",
                        "xi": "j",
                        "c": [{
                            "t": "|i:"
                        }, {
                            "x": "ixx"
                        }, {
                            "t": ",j:"
                        }, {
                            "x": "j"
                        }, {
                            "t": ",value:"
                        }, {
                            "x": "item"
                        }, {
                            "t": "|"
                        }]
                    }]
                }, {
                    "t": ", "
                }]
            }]
        };
        const insertPoint = document.body;
        const minimo = new function () {
            var objList = [{
                text: "One",
                values: []
            }, {
                text: "Two",
                values: []
            }];
            this.eval = function (s) {
                return eval(s);
            }
            this.add = function (item, index) {
                objList.splice(index, 0, item);
            }
            this.remove = function (i) {
                objList.splice(i, 1);
            }
            this.getItem = function (i) {
                return objList[i];
            }
        }
        const domObj = new dom.DOM(minimo, document.body, document);
        const virtualDomManager = new virtualDom.VirtualDomManager(minimo, domObj, buildComponentBuilderFunction);
        return virtualDomManager.build(json, insertPoint)
            .then(vdom => {
                vdom.update();
                const d1 = document.getElementById("d1");
                d1.innerHTML.should.be.eq('item:One, item:Two, ');
                minimo.add({
                    text: "New",
                    values: ["v1", "v2"]
                }, 1);
                vdom.update();
                d1.innerHTML.should.be.eq('item:One, item:New, values:|i:1,j:0,value:v1||i:1,j:1,value:v2|, item:Two, ');

                minimo.getItem(0).values.push("a");
                minimo.getItem(0).values.push("b");
                minimo.getItem(0).values.push("c");
                vdom.update();
                d1.innerHTML.should.be.eq('item:One, values:|i:0,j:0,value:a||i:0,j:1,value:b||i:0,j:2,value:c|, item:New, values:|i:1,j:0,value:v1||i:1,j:1,value:v2|, item:Two, ');

                minimo.remove(0);
                vdom.update();
                d1.innerHTML.should.be.eq('item:New, values:|i:0,j:0,value:v1||i:0,j:1,value:v2|, item:Two, ');
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
                        }, {
                            "t": ":"
                        },{
                            "x": "this.wvar"
                        }]
                    }, {
                        "t": " - "
                    }, {
                        "n": "span",
                        "a": {
                            "id": "sp2"
                        },
                        "c": [{
                            "x": "this.innerattribute.test"
                        }, {
                            "t": "-"
                        }, {
                            "x": "obj.id"
                        }]
                    }]
                },
                "wraperVarName": "wvar"
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
        
        const minimo = new function(){
            const obj = {
                id: 'objid'
            }
            this.id = 'mid';
            this.eval = function (s) {
                return eval(s);
            }
        }
        const domObj = new dom.DOM(minimo, document.body, document);
        const virtualDomManager = new virtualDom.VirtualDomManager(minimo, domObj, buildComponentBuilderFunction);
        return virtualDomManager.build(json, insertPoint)
            .then(vdom => {
                vdom.update();
                console.log(document.body.innerHTML)
                expect(document.getElementById("mid")).not.be.null;
                document.getElementById("sp").innerHTML.should.eq("wid");
                document.getElementById("sp2").innerHTML.should.eq("wid_test-objid");
            })
    });
    // Alterar o Html parser, precisa demarcar htmls que sao definidos dentro do template do que é xbod
    //      o que for interno do template executa num ctx mixo de internal e external
    //      se for xbody executa normal, sem o component internal ctx
});