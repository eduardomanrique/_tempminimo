const expect = require('chai').expect;
require('chai').should();
const _ = require('underscore');
const assert = require('assert');
const jsdom = require('mocha-jsdom');
const dom = require('../minimojs/client/dom.js');

let dom1, dom2, dom3;

describe('Client scripts - dom.js', () => {
    jsdom()
    before(() => {
        document.body.innerHTML = `
            <div id="rootInstance">
                <span>
                    <div id="test" class="cl2" name="x"></div>
                </span>
                <div class="test" name="c" id="y"></div>
                <span class="cl" name="c"></span>
                <div id="innerInstance">
                    <div>
                        <span id="test2" name="c"></span>
                    </div>
                </div>
                <div id="innerInstance2">
                    <div>
                        <span id="test3" name="c"></span>
                        <span id="test4" name="c"></span>
                        <span id="test5" name="c"></span>
                        <span id="test6" v="x"></span>
                    </div>
                </div>
            </div>`;
        dom1 = new dom.DOM({id: 'm1'}, document.getElementById("rootInstance"), document);
        dom2 = new dom.DOM({id: 'm2'}, document.getElementById("innerInstance"), document);
        dom3 = new dom.DOM({id: 'm3'}, document.getElementById("innerInstance2"), document);
    });
    it('Static function', () => {
        const test = dom.byId("test", document).value;
        test.id.should.be.eq("test");
        expect(dom.byId("a", document).isPresent()).to.be.false;
        dom.byClass("cl", document).should.have.lengthOf(1);
        dom.addClass(test, "cl");
        dom.byClass("cl", document).should.have.lengthOf(2);
        dom.removeClass(test, "cl");
        dom.byClass("cl", document).should.have.lengthOf(1);
        dom.byName("c").should.have.lengthOf(6);
    });
    it('DOM by id', () => {
        dom1.getElementById("test").isPresent().should.be.true;
        dom2.getElementById("test").isPresent().should.be.false;
        dom1.getElementById("test3").isPresent().should.be.false;
        dom2.getElementById("test3").isPresent().should.be.false;
        dom3.getElementById("test3").isPresent().should.be.true;
        dom1.getElementById("test2").isPresent().should.be.false;
        dom2.getElementById("test2").isPresent().should.be.true;
    });
    it('DOM by name', () => {
        dom1.getElementsByName("c").should.have.lengthOf(2);
        dom2.getElementsByName("c").should.have.lengthOf(1);
        dom3.getElementsByName("c").should.have.lengthOf(3);
    });
    it('DOM by tag name', () => {
        dom1.getElementsByTagNames("div").should.have.lengthOf(2);
        dom2.getElementsByTagNames("div").should.have.lengthOf(1);
        dom3.getElementsByTagNames("div").should.have.lengthOf(1);

        dom1.getElementsByTagNames("div", "span").should.have.lengthOf(4);
        dom2.getElementsByTagNames("div", "span").should.have.lengthOf(2);
        dom3.getElementsByTagNames("div", "span").should.have.lengthOf(5);
    });

    it('DOM by attribute', () => {
        dom1.getElementsByAttribute("name").should.have.lengthOf(3);
        dom2.getElementsByAttribute("name").should.have.lengthOf(1);
        dom3.getElementsByAttribute("name").should.have.lengthOf(3);

        dom1.getElementsByAttribute("name", v => v == 'x').should.have.lengthOf(1);
    });

    it('DOM first by attribute', () => {
        dom1.findFirstElementByAttribute("name").getAttribute("id").should.eq("test");
        dom2.findFirstElementByAttribute("name").getAttribute("id").should.eq("test2");
        dom3.findFirstElementByAttribute("name").getAttribute("id").should.eq("test3");

        dom1.findFirstElementByAttribute("name", v => v == 'c').getAttribute("id").should.eq("y");
    });
});