const expect = require('chai').expect;
require('chai').should();
const _ = require('underscore');
const assert = require('assert');
const jsdom = require('mocha-jsdom')
const instanceManager = require('../minimojs/client/instances-manager.js');

describe('Client scripts - instances-manager.js', () => {
    jsdom()
    before(() => {
        
    });
    it('Start main instance', () => {
        instanceManager.startMainInstance()
    });
    it('to iterable', () => {
        function a() {
            return util.toIterable(arguments);
        }
        const b = a(1, 2, 3);
        b.next().value.should.eq(1);
        b.next().value.should.eq(2);
        b.next().value.should.eq(3);
        expect(b.next().value).to.be.undefined;
    });
    it('one line template string', () => {
        const oneline = util.oneline `T
        es
        tin

        g

        `;
        oneline.should.eq('Testing');
    })
    it('tests doc', () => {
        util.byId("test", document).id.should.be.eq("test");
        expect(util.byId("a", document)).to.be.null;
        util.byClass("cl", document).should.have.lengthOf(2);
        util.byName("c", document).should.have.lengthOf(1);
    });
    it('tests find minimo instance', () => {
        const instance1 = util.findMinimoInstanceForElement(document.getElementById("test"));
        instance1.getAttribute("id").should.eq("rootInstance");
        const instance2 = util.findMinimoInstanceForElement(document.getElementById("test2"));
        instance2.getAttribute("id").should.eq("rootInstance");
    });
});