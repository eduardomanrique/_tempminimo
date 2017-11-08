const expect = require('chai').expect;
require('chai').should();
const _ = require('underscore');
const assert = require('assert');
const jsdom = require('mocha-jsdom');
const dom = require('../minimojs/client/dom.js');
const htmlBuilder = require('../minimojs/client/html-builder.js');

jsdom({
    skipWindowCheck: true
});

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
                    "class": "cl1 cl2"
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
            }
        }
        const domObj = new dom.DOM(minimo, document.body, document);
        const builder = new htmlBuilder.HtmlBuilder(minimo, domObj, {});
        builder.createElements(json, insertPoint)
            .then(updater => {
                console.log(updater);
                console.log(document.body.innerHTML);
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
        builder.createElements(json, insertPoint)
            .then(updater => {
                console.log(updater);
                updater.updateAttributes();
                console.log(document.body.innerHTML);
            })
    });
});