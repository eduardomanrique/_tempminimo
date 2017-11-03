const expect = require('chai').expect;
require('chai').should();
const _ = require('underscore');
const assert = require('assert');
const jsdom = require('mocha-jsdom');
const util = require('../minimojs/client/util.js');

describe('Client scripts - util.js', () => {
    jsdom()
    before(() => {
        document.body.innerHTML = `
            <div data-mroot-ctx="i1" id="rootInstance">
                <div id="test" class="cl"></div>
                <div class="test"></div>
                <span class="cl" name="c"></span>
                <div data-mroot-ctx="i1" id="innerInstance">
                    <div>
                        <span id="test2"></span>
                    </div>
                </div>
            </div>`;
        document.getElementById("test").CTX="i1";
        document.getElementById("test2").CTX="i1";
    });
    it('tests arrays', () => {
        util.flatten([1, [2, [3, 4]], 5]).should.have.lengthOf(5);
        const array = util.nodeListToArray(document.getElementsByClassName("cl"));
        array.should.have.lengthOf(2);
        array[0].id.should.eq('test');
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
});