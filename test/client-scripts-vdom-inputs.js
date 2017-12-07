const chai = require('chai');
const expect = chai.expect;
const _ = require('underscore');
const assert = require('assert');
const jsdom = require('mocha-jsdom');
const inputs = require('../minimojs/client/vdom/inputs');
const spies = require('chai-spies');
chai.should();
chai.use(spies);


describe('Test Inputs', () => {
    jsdom({ skipWindowCheck: true });
    it('Simple text', () => {
        document.body.innerHTML = `
            <input type="text" id="i1" value="cb">
        `;
        let input = document.getElementById("i1");
        vdom = new function(){
            this._e = input;
        }
        const f = inputs._test._buildFunctions(vdom);
        f.partialValidate('c', 'ab').should.be.true;
        f.validate('abc').should.be.true;
        f.extract().should.eq('cb');
        f.update('123');
        input.value.should.eq('123');
    });
    it('Integer text', () => {
        document.body.innerHTML = `
            <input type="text" id="i1" m-type="integer" value="12">
        `;
        let input = document.getElementById("i1");
        vdom = new function(){
            this._e = input;
        }
        const f = inputs._test._buildFunctions(vdom);
        f.partialValidate('c', '12c').should.be.false;
        f.partialValidate('1', '121').should.be.true;
        f.validate('abc').should.be.false;
        f.validate('123').should.be.true;
        f.extract().should.eq(12);
        f.update(123);
        input.value.should.eq('123');
    });
    it('Float text', () => {
        document.body.innerHTML = `
            <input type="text" id="i1" m-type="float" value="1.01">
        `;
        let input = document.getElementById("i1");
        vdom = new function(){
            this._e = input;
        }
        const f = inputs._test._buildFunctions(vdom);
        f.partialValidate('c', '12c').should.be.false;
        f.partialValidate('.', '121').should.be.true;
        f.partialValidate('2', '12.1').should.be.true;
        f.partialValidate('.', '12.1.').should.be.false;
        f.validate('abc').should.be.false;
        f.validate('123').should.be.true;
        f.validate('123.0').should.be.true;
        f.validate('123.011').should.be.false;
        f.extract().should.eq(1.01);
        f.update(12.3);
        input.value.should.eq('12.3');
    });
    it('Float text masked', () => {
        document.body.innerHTML = `
            <input type="text" id="i1" m-type="float(,000)" value="2,3">
        `;
        let input = document.getElementById("i1");
        vdom = new function(){
            this._e = input;
        }
        const f = inputs._test._buildFunctions(vdom);
        f.partialValidate('c', '12c').should.be.false;
        f.partialValidate('.', '121').should.be.false;
        f.partialValidate(',', '121').should.be.true;
        f.partialValidate('2', '12,1').should.be.true;
        f.partialValidate('2', '12.1').should.be.false;
        f.partialValidate(',', '12,1,').should.be.false;
        f.validate('abc').should.be.false;
        f.validate('123').should.be.true;
        f.validate('123,0').should.be.true;
        f.validate('123.011').should.be.false;
        f.validate('123,011').should.be.true;
        f.extract().should.eq(2.3);
        f.update(12.3);
        input.value.should.eq('12,3');
    });
    it('Date text', () => {
        document.body.innerHTML = `
            <input type="text" id="i1" m-type="date" value="2017-12-27">
        `;
        let input = document.getElementById("i1");
        vdom = new function(){
            this._e = input;
        }
        const f = inputs._test._buildFunctions(vdom);
        f.partialValidate('1', '12345-01-01').should.be.false;
        f.partialValidate('1', '1234-02').should.be.true;
        f.partialValidate('-', '1234-02-').should.be.true;
        f.partialValidate('1', '1').should.be.true;
        f.validate('abc').should.be.false;
        f.validate('123').should.be.false;
        f.validate('1233-2').should.be.false;
        f.validate('1234-02-01').should.be.true;
        let date = f.extract();
        expect(date instanceof Date).to.be.true;
        date.getFullYear().should.eq(2017);
        date.getMonth().should.eq(11);
        date.getDate().should.eq(27);
        f.update(new Date(2001, 01, 02));
        input.value.should.eq('2001-02-02');
    });
    it('Date text masked', () => {
        document.body.innerHTML = `
            <input type="text" id="i1" m-type="date(dd/MM/yyyy)" value="27/12/2017">
        `;
        let input = document.getElementById("i1");
        vdom = new function(){
            this._e = input;
        }
        const f = inputs._test._buildFunctions(vdom);
        f.partialValidate('1', '001/01/2201').should.be.false;
        f.partialValidate('1', '12/02').should.be.true;
        f.partialValidate('/', '12/02/').should.be.true;
        f.partialValidate('1', '1').should.be.true;
        f.validate('abc').should.be.false;
        f.validate('123').should.be.false;
        f.validate('12/33/2').should.be.false;
        f.validate('01/02/1234').should.be.true;
        let date = f.extract();
        expect(date instanceof Date).to.be.true;
        date.getFullYear().should.eq(2017);
        date.getMonth().should.eq(11);
        date.getDate().should.eq(27);
        f.update(new Date(2001, 01, 02));
        input.value.should.eq('02/02/2001');
    });
});