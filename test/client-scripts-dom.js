const expect = require('chai').expect;
require('chai').should();
const _ = require('underscore');
const assert = require('assert');
const jsdom = require('mocha-jsdom');
const dom = require('../minimojs/client/dom.js');

const minimo1 = {
    id: 'i1'
}

const minimo2 = {
    id: 'i2'
}

describe('Client scripts - dom.js', () => {
    jsdom()
    before(() => {
        document.body.innerHTML = `
            <div data-mroot-ctx="i1" id="rootInstance">
                <div id="test" class="cl2"></div>
                <div class="test"></div>
                <span class="cl" name="c"></span>
                <div data-mroot-ctx="i2" id="innerInstance">
                    <div>
                        <span id="test2"></span>
                    </div>
                </div>
            </div>`;
        document.getElementById("test").CTX="i1";
        document.getElementById("test2").CTX="i1";
    });
    it('tests doc', () => {
        const test = dom.byId("test", document).value;
        test.id.should.be.eq("test");
        expect(dom.byId("a", document).isPresent()).to.be.false;
        dom.byClass("cl", document).should.have.lengthOf(1);
        dom.addClass(test, "cl");
        dom.byClass("cl", document).should.have.lengthOf(2);
        dom.removeClass(test, "cl");
        dom.byClass("cl", document).should.have.lengthOf(1);
        dom.byName("c").should.have.lengthOf(1);
    });
    it('DOM', () => {
        const d1 = new dom.DOM(minimo1, document);
        const d2 = new dom.DOM(minimo2, document);
        d1.getElementById("test").isPresent().should.be.true;
        d2.getElementById("test").isPresent().should.be.false;
    })
});