const expect = require('chai').expect;
require('chai').should();
const _ = require('underscore');
const assert = require('assert');
const jsdom = require('mocha-jsdom');
const EventImpl = require('jsdom/lib/jsdom/living/events/Event-impl').implementation;
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
                .replace('"%components%"', comp.getScripts())
                .replace('"%component-types%"', comp.getComponentTypes())
                .replace('"%__setUpGetterForAttributes%"', comp.getSetUpGetterForAttributesScript());
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
                    "src": "/test.js"
                }
            }]
        };
        const insertPoint = document.body;
        const minimo = {
            eval: function (s) {
                return eval(s);
            },
            _dom: new dom.DOM(this, document.body, document)
        }
        const vdom = new virtualDom.VirtualDom([json], insertPoint, null, null, minimo, false, buildComponentBuilderFunction);
        vdom._defaultUpdateDelay = 0;
        return vdom.build()
            .then(() => {
                //console.log(document.body.innerHTML)
                document.getElementById("d1").getAttribute("class").should.eq("cl1 cl2");
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
            this._dom = new dom.DOM(this, document.body, document);
        }
        const vdom = new virtualDom.VirtualDom([json], insertPoint, null, null, minimo, false, buildComponentBuilderFunction);
        vdom._defaultUpdateDelay = 0;
        return vdom.build()
            .then(vdom.update)
            .then(() => {
                expect(document.getElementById("ID_2")).not.be.null;
                document.getElementById("checkedDiv").getAttribute("checked").should.eq("true");
                minimo._obj.isChecked = false;
                minimo._obj.id = 2;
                // console.log(document.body.innerHTML);
            })
            .then(vdom.update)
            .then(() => {
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
            eval: function (s) {},
            _dom: new dom.DOM(this, document.body, document)
        }
        const vdom = new virtualDom.VirtualDom([json], insertPoint, null, null, minimo, false, buildComponentBuilderFunction);
        vdom._defaultUpdateDelay = 0;
        return vdom.build()
            .then(vdom.update)
            .then(() => {
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
            this._dom = new dom.DOM(this, document.body, document);
        }
        const vdom = new virtualDom.VirtualDom([json], insertPoint, null, null, minimo, false, buildComponentBuilderFunction);
        vdom._defaultUpdateDelay = 0;
        return vdom.build()
            .then(vdom.update)
            .then(() => {
                const d1 = document.getElementById("d1");
                d1.innerHTML.should.be.eq("");
                minimo.setA("show");
            })
            .then(vdom.update)
            .then(() => {
                const d1 = document.getElementById("d1");
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
            this._dom = new dom.DOM(this, document.body, document);
        }
        const vdom = new virtualDom.VirtualDom([json], insertPoint, null, null, minimo, false, buildComponentBuilderFunction);
        vdom._defaultUpdateDelay = 0;
        return vdom.build()
            .then(vdom.update)
            .then(() => {
                const d1 = document.getElementById("d1");
                d1.innerHTML.should.be.eq("");
                minimo.setA("show");
            })
            .then(vdom.update)
            .then(() => {
                const d1 = document.getElementById("d1");
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
            this._dom = new dom.DOM(this, document.body, document);
        }
        const vdom = new virtualDom.VirtualDom([json], insertPoint, null, null, minimo, false, buildComponentBuilderFunction);
        vdom._defaultUpdateDelay = 0;
        return vdom.build()
            .then(vdom.update)
            .then(() => {
                const d1 = document.getElementById("d1");
                d1.innerHTML.should.be.eq("");
                minimo.setA("show");
            })
            .then(vdom.update)
            .then(() => {
                const d1 = document.getElementById("d1");
                d1.innerHTML.should.be.eq("");
                minimo.setB("show");
            })
            .then(vdom.update)
            .then(() => {
                const d1 = document.getElementById("d1");
                d1.innerHTML.should.be.eq("showing");
                minimo.setA("hide");
            })
            .then(vdom.update)
            .then(() => {
                const d1 = document.getElementById("d1");
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
            this._dom = new dom.DOM(this, document.body, document);
        }
        const vdom = new virtualDom.VirtualDom([json], insertPoint, null, null, minimo, false, buildComponentBuilderFunction);
        vdom._defaultUpdateDelay = 0;
        return vdom.build()
            .then(vdom.update)
            .then(() => {
                const d1 = document.getElementById("d1");
                d1.innerHTML.should.be.eq('item:{"id":1,"text":"One"}, index:1, item:{"id":2,"text":"Two"}, index:2, ');
                minimo.add({
                    added: "New"
                }, 1);
                minimo.getItem(2).id = 1000;
                minimo.getItem(2).text = "1000";
            })
            .then(vdom.update)
            .then(() => {
                const d1 = document.getElementById("d1");
                d1.innerHTML.should.be.eq('item:{"id":1,"text":"One"}, index:1, item:{"added":"New"}, index:2, item:{"id":1000,"text":"1000"}, index:3, ');
                minimo.remove(0);
            })
            .then(vdom.update)
            .then(() => {
                const d1 = document.getElementById("d1");
                d1.innerHTML.should.be.eq('item:{"added":"New"}, index:1, item:{"id":1000,"text":"1000"}, index:2, ');
                minimo.remove(1);
            })
            .then(vdom.update)
            .then(() => {
                const d1 = document.getElementById("d1");
                d1.innerHTML.should.be.eq('item:{"added":"New"}, index:1, ');
                minimo.remove(0);
            })
            .then(vdom.update)
            .then(() => {
                const d1 = document.getElementById("d1");
                d1.innerHTML.should.be.eq('');
                minimo.add({
                    added: "New"
                }, 1);
            })
            .then(vdom.update)
            .then(() => {
                const d1 = document.getElementById("d1");
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
            this._dom = new dom.DOM(this, document.body, document);
        }
        const vdom = new virtualDom.VirtualDom([json], insertPoint, null, null, minimo, false, buildComponentBuilderFunction);
        vdom._defaultUpdateDelay = 0;
        return vdom.build()
            .then(vdom.update)
            .then(() => {
                const d1 = document.getElementById("d1");
                d1.innerHTML.should.be.eq('item:One, item:Two, ');
                minimo.add({
                    text: "New",
                    values: ["v1", "v2"]
                }, 1);
            })
            .then(vdom.update)
            .then(() => {
                const d1 = document.getElementById("d1");
                d1.innerHTML.should.be.eq('item:One, item:New, values:|i:1,j:0,value:v1||i:1,j:1,value:v2|, item:Two, ');

                minimo.getItem(0).values.push("a");
                minimo.getItem(0).values.push("b");
                minimo.getItem(0).values.push("c");
            })
            .then(vdom.update)
            .then(() => {
                const d1 = document.getElementById("d1");
                d1.innerHTML.should.be.eq('item:One, values:|i:0,j:0,value:a||i:0,j:1,value:b||i:0,j:2,value:c|, item:New, values:|i:1,j:0,value:v1||i:1,j:1,value:v2|, item:Two, ');

                minimo.remove(0);
            })
            .then(vdom.update)
            .then(() => {
                const d1 = document.getElementById("d1");
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
                "innerattribute": [{
                    "test": [{
                        "s": "this.id"
                    }, "_test"],
                    "content": [{
                        "n": "span",
                        "a": {
                            "id": "sp"
                        },
                        "c": [{
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
                            "x": "this.wtestvar"
                        }, {
                            "t": "-"
                        }, {
                            "x": "obj.id"
                        }]
                    }]
                }],
                "wraperVarName": "wvar",
                "wraperTestVarName": "wtestvar"
            },
            "c": [{
                "n": "div",
                "a": {
                    "id": [{
                        "s": "this.id"
                    }]
                },
                "c": [{
                    "x": "this.innerattribute[0].test"
                }, {
                    "t": ": "
                }, {
                    "x": "this.innerattribute[0].content"
                }]
            }]
        };
        const insertPoint = document.body;

        const minimo = new function () {
            const obj = {
                id: 'objid'
            }
            this.id = 'mid';
            this.eval = function (s) {
                return eval(s);
            }
            this._dom = new dom.DOM(this, document.body, document);
        }
        const vdom = new virtualDom.VirtualDom([json], insertPoint, null, null, minimo, false, buildComponentBuilderFunction);
        vdom._defaultUpdateDelay = 0;
        return vdom.build()
            .then(vdom.update)
            .then(() => {
                expect(document.getElementById("wid")).not.be.null;
                document.getElementById("sp").innerHTML.should.eq("abcd");
                document.getElementById("sp2").innerHTML.should.eq("mid_test-objid");
            })
    });

    it('Checkbox init', () => {
        document.body.innerHTML = `
            <html>
                <body></body>
            </html>
        `;
        const json = {
            "n": "input",
            "a": {
                "type": "checkbox",
                "id": "c1",
                "bind": "obj.b"
            }
        };
        const insertPoint = document.body;
        const minimo = new function () {
            var obj;
            this.eval = function (s) {
                return eval(s);
            };
            this.root = {
                ready: (fn) => this.onReady = fn
            }
            this._dom = new dom.DOM(this, document.body, document);
        }
        const vdom = new virtualDom.VirtualDom([json], insertPoint, null, null, minimo, false, buildComponentBuilderFunction);
        vdom._defaultUpdateDelay = 0;
        return vdom.build()
            .then(() => {
                expect(minimo.eval('obj').b).to.be.undefined;
                minimo.onReady();
                expect(minimo.eval('obj').b).to.be.false;
            })
    });

    it('Checkbox list', () => {
        document.body.innerHTML = `
            <html>
                <body></body>
            </html>
        `;
        const json = {
            "n": "div",
            "c": [{
                "n": "input",
                "a": {
                    "type": "checkbox",
                    "id": "c1",
                    "value": [{
                        "s": "v1"
                    }],
                    "bind": "obj.list"
                }
            }, {
                "n": "input",
                "a": {
                    "type": "checkbox",
                    "id": "c2",
                    "value": [{
                        "s": "v2"
                    }],
                    "bind": "obj.list"
                }
            }]
        };
        const insertPoint = document.body;
        const minimo = new function () {
            var v1 = {
                name: "val1"
            }
            var v2 = {
                name: "val2"
            }
            var obj;
            this.eval = function (s) {
                return eval(s);
            };
            this.root = {
                ready: (fn) => this.onReady = fn
            }
            this._dom = new dom.DOM(this, document.body, document);
        }
        const vdom = new virtualDom.VirtualDom([json], insertPoint, null, null, minimo, false, buildComponentBuilderFunction);
        vdom._defaultUpdateDelay = 0;
        return vdom.build()
            .then(() => {
                let obj = minimo.eval('obj');
                let v1 = minimo.eval('v1');
                let v2 = minimo.eval('v2');
                expect(obj.list).to.be.undefined;
                minimo.onReady();
                obj.list.should.have.lengthOf(0);
                document.getElementById("c1").checked = true;
                document.getElementById("c1").dispatchEvent(new EventImpl(['change', {}], {}));
                return new Promise(r => {
                    setTimeout(() => {
                        obj.list.should.have.lengthOf(1);
                        obj.list.indexOf(v1).should.be.greaterThan(-1);
                        document.getElementById("c2").checked = true;
                        document.getElementById("c2").dispatchEvent(new EventImpl(['change', {}], {}));
                        setTimeout(() => {
                            obj.list.should.have.lengthOf(2);
                            obj.list.indexOf(v1).should.be.greaterThan(-1);
                            obj.list.indexOf(v2).should.be.greaterThan(-1);
                            document.getElementById("c1").checked = false;
                            document.getElementById("c1").dispatchEvent(new EventImpl(['change', {}], {}));
                            setTimeout(() => {
                                obj.list.should.have.lengthOf(1);
                                obj.list.indexOf(v1).should.eq(-1);
                                obj.list.indexOf(v2).should.be.greaterThan(-1);
                                document.getElementById("c2").checked = false;
                                document.getElementById("c2").dispatchEvent(new EventImpl(['change', {}], {}));
                                setTimeout(() => {
                                    obj.list.should.have.lengthOf(0);
                                    r();
                                }, 100);
                            }, 100);
                        }, 100);
                    }, 100);
                })
            })
    });

    it('RadioGroup', () => {
        document.body.innerHTML = `
            <html>
                <body></body>
            </html>
        `;
        const json = {
            "n": "div",
            "c": [{
                "n": "input",
                "a": {
                    "type": "radio",
                    "id": "r1",
                    "name": "r",
                    "value": [{
                        "s": "v1"
                    }],
                    "bind": "obj.val"
                }
            }, {
                "n": "input",
                "a": {
                    "type": "radio",
                    "id": "r2",
                    "name": "r",
                    "value": [{
                        "s": "v2"
                    }],
                    "bind": "obj.val"
                }
            }, {
                "n": "input",
                "a": {
                    "type": "radio",
                    "id": "r3",
                    "name": "r",
                    "value": "val3",
                    "bind": "obj.val"
                }
            }]
        };
        const insertPoint = document.body;
        const minimo = new function () {
            var v1 = {
                name: "val1"
            }
            var v2 = 2;
            var obj = {};
            this.eval = function (s) {
                return eval(s);
            };
            this.root = {
                ready: (fn) => this.onReady = fn
            }
            this._dom = new dom.DOM(this, document.body, document);
        }
        const vdom = new virtualDom.VirtualDom([json], insertPoint, null, null, minimo, false, buildComponentBuilderFunction);
        vdom._defaultUpdateDelay = 0;
        return vdom.build()
            .then(() => {
                let obj = minimo.eval('obj');
                let v1 = minimo.eval('v1');
                expect(obj.val).to.be.undefined;
                let r1 = document.getElementById("r1");
                let r2 = document.getElementById("r2");
                let r3 = document.getElementById("r3");
                expect(r1._vdom._getValueFromElement()).to.be.null;
                expect(r2._vdom._getValueFromElement()).to.be.null;
                expect(r3._vdom._getValueFromElement()).to.be.null;
                minimo.onReady();
                obj.val = v1;
                return vdom.update().then(() => new Promise(r => {
                    setTimeout(() => {
                        expect(r1._vdom._getValueFromElement()).to.eq(v1);
                        expect(r2._vdom._getValueFromElement()).to.eq(v1);
                        expect(r3._vdom._getValueFromElement()).to.eq(v1);
                        r2.checked = true;
                        r2.dispatchEvent(new EventImpl(['change', {}], {}));
                        setTimeout(() => {
                            obj.val.should.eq(2);
                            expect(r1._vdom._getValueFromElement()).to.eq(2);
                            expect(r2._vdom._getValueFromElement()).to.eq(2);
                            expect(r3._vdom._getValueFromElement()).to.eq(2);
                            r3.checked = true;
                            r3.dispatchEvent(new EventImpl(['change', {}], {}));
                            setTimeout(() => {
                                obj.val.should.eq("val3");
                                expect(r1._vdom._getValueFromElement()).to.eq("val3");
                                expect(r2._vdom._getValueFromElement()).to.eq("val3");
                                expect(r3._vdom._getValueFromElement()).to.eq("val3");
                                r();
                            }, 100);
                        }, 100);
                    }, 100);
                }));
            });
    });
});