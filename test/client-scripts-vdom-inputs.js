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
    jsdom({
        skipWindowCheck: true
    });
    it('Simple text', () => {
        document.body.innerHTML = `
            <input type="text" id="i1" value="cb">
        `;
        let input = document.getElementById("i1");
        vdom = new function () {
            this._e = input;
        }
        const f = inputs._test._buildFunctions(input);
        f.partialValidate('c', 'ab').should.be.true;
        f.validate('abc').should.be.true;
        f.extract().should.eq('cb');
        f.update('123');
        input.value.should.eq('123');
    });
    it('Integer text', () => {
        document.body.innerHTML = `
            <input type="text" id="i1" bind-type="integer" value="12">
        `;
        let input = document.getElementById("i1");
        vdom = new function () {
            this._e = input;
            input._vdom = this;
        }
        const f = inputs._test._buildFunctions(input);
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
            <input type="text" id="i1" bind-type="float" value="1.01">
        `;
        let input = document.getElementById("i1");
        vdom = new function () {
            this._e = input;
        }
        const f = inputs._test._buildFunctions(input);
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
            <input type="text" id="i1" bind-type="float(,000)" value="2,3">
        `;
        let input = document.getElementById("i1");
        vdom = new function () {
            this._e = input;
        }
        const f = inputs._test._buildFunctions(input);
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
            <input type="text" id="i1" bind-type="date" value="2017-12-27">
        `;
        let input = document.getElementById("i1");
        vdom = new function () {
            this._e = input;
        }
        const f = inputs._test._buildFunctions(input);
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
            <input type="text" id="i1" bind-type="date(dd/MM/yyyy)" value="27/12/2017">
        `;
        let input = document.getElementById("i1");
        vdom = new function () {
            this._e = input;
        }
        const f = inputs._test._buildFunctions(input);
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
    it('Date', () => {
        document.body.innerHTML = `
            <input type="date" id="i1" value="2017-12-27">
        `;
        let input = document.getElementById("i1");
        vdom = new function () {
            this._e = input;
        }
        const f = inputs._test._buildFunctions(input);
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

    it('Datetime text', () => {
        document.body.innerHTML = `
            <input type="text" id="i1" bind-type="datetime" value="2017-12-27T14:50">
        `;
        let input = document.getElementById("i1");
        vdom = new function () {
            this._e = input;
        }
        const f = inputs._test._buildFunctions(input);
        f.partialValidate('1', '12345-01-01T01:02').should.be.false;
        f.partialValidate('1', '1234-02-01T1').should.be.true;
        f.partialValidate('-', '1234-02-').should.be.true;
        f.partialValidate('1', '1').should.be.true;
        f.validate('abc').should.be.false;
        f.validate('123').should.be.false;
        f.validate('1233-2').should.be.false;
        f.validate('1234-02-01T14:01').should.be.true;
        let date = f.extract();
        expect(date instanceof Date).to.be.true;
        date.getFullYear().should.eq(2017);
        date.getMonth().should.eq(11);
        date.getDate().should.eq(27);
        date.getHours().should.eq(14);
        date.getMinutes().should.eq(50);
        f.update(new Date(2001, 01, 02, 13, 15));
        input.value.should.eq('2001-02-02T13:15');
    });
    it('Datetime text masked', () => {
        document.body.innerHTML = `
            <input type="text" id="i1" bind-type="datetime(dd/MM/yyyy, HH:mm)" value="27/12/2017, 01:30">
        `;
        let input = document.getElementById("i1");
        vdom = new function () {
            this._e = input;
        }
        const f = inputs._test._buildFunctions(input);
        f.partialValidate('1', '001/01/2201').should.be.false;
        f.partialValidate('1', '12/02').should.be.true;
        f.partialValidate('/', '12/02/2018, ').should.be.true;
        f.partialValidate('1', '1').should.be.true;
        f.validate('abc').should.be.false;
        f.validate('123').should.be.false;
        f.validate('12/33/2').should.be.false;
        f.validate('01/02/1234, 15:51').should.be.true;
        let date = f.extract();
        expect(date instanceof Date).to.be.true;
        date.getFullYear().should.eq(2017);
        date.getMonth().should.eq(11);
        date.getDate().should.eq(27);
        date.getHours().should.eq(1);
        date.getMinutes().should.eq(30);
        f.update(new Date(2001, 01, 02, 16, 45));
        input.value.should.eq('02/02/2001, 16:45');
    });
    it('Datetime', () => {
        document.body.innerHTML = `
            <input type="datetime-local" id="i1" value="2017-12-27T14:50">
        `;
        let input = document.getElementById("i1");
        vdom = new function () {
            this._e = input;
        }
        const f = inputs._test._buildFunctions(input);
        f.partialValidate('1', '12345-01-01T01:02').should.be.false;
        f.partialValidate('1', '1234-02-01T1').should.be.true;
        f.partialValidate('-', '1234-02-').should.be.true;
        f.partialValidate('1', '1').should.be.true;
        f.validate('abc').should.be.false;
        f.validate('123').should.be.false;
        f.validate('1233-2').should.be.false;
        f.validate('1234-02-01T14:01').should.be.true;
        let date = f.extract();
        expect(date instanceof Date).to.be.true;
        date.getFullYear().should.eq(2017);
        date.getMonth().should.eq(11);
        date.getDate().should.eq(27);
        date.getHours().should.eq(14);
        date.getMinutes().should.eq(50);
        f.update(new Date(2001, 01, 02, 13, 15));
        input.value.should.eq('2001-02-02T13:15');
    });
    it('Boolean', () => {
        document.body.innerHTML = `
            <input type="checkbox" id="i1" checked>
        `;
        let input = document.getElementById("i1");
        vdom = new function () {
            this._e = input;
        }
        const f = inputs._test._buildFunctions(input);
        let val = f.extract();
        val.should.be.true;

        input.checked = false;
        val = f.extract();
        val.should.be.false;

        f.update(true);
        input.checked.should.be.true;

        f.update(false);
        input.checked.should.be.false;
    });
    it('String boolean', () => {
        document.body.innerHTML = `
            <input type="text" id="i1" bind-type="boolean">
        `;
        let input = document.getElementById("i1");
        vdom = new function () {
            this._e = input;
        }
        const f = inputs._test._buildFunctions(input);
        let val = f.extract();
        val.should.be.false;

        input.value = "true";
        val = f.extract();
        val.should.be.true;

        input.value = "false";
        val = f.extract();
        val.should.be.false;

        f.update(true);
        input.value.should.eq("true");

        f.update(false);
        input.value.should.eq("false");
    });
    it('String masked boolean', () => {
        document.body.innerHTML = `
            <input type="text" id="i1" bind-type="boolean(yes,no)">
        `;
        let input = document.getElementById("i1");
        vdom = new function () {
            this._e = input;
        }
        const f = inputs._test._buildFunctions(input);
        let val = f.extract();
        val.should.be.false;

        input.value = "yes";
        val = f.extract();
        val.should.be.true;

        input.value = "no";
        val = f.extract();
        val.should.be.false;

        f.update(true);
        input.value.should.eq("yes");

        f.update(false);
        input.value.should.eq("no");
    });
    it('Any', () => {
        document.body.innerHTML = `
            <input type="radio" id="i1" name="r" bind-type="object" value="innerObj">
        `;
        let input = document.getElementById("i1");
        var obj = {
            name: "sample"
        }
        vdom = new function () {
            var innerObj = obj;
            this._e = input;
            this.ctx = {
                eval: function (s) {
                    return eval(s);
                }
            };
        }
        const f = inputs._test._buildFunctions(input, vdom.ctx);
        let val = f.extract();
        val.should.eq(obj);
        val.name.should.eq("sample");
    });

    it('Combo', () => {
        document.body.innerHTML = `
            <select id="i1">
                <option value="string">v1</option>
                <option bind-type="integer">1</option>
                <option bind-type="float(,0)" value="2,1">2,1</option>
                <option bind-type="date(dd/MM/yyyy)" value="01/02/2017">01/02/2017</option>
                <option bind-type="object" value="obj">object</option>
            </select>
        `;
        let input = document.getElementById("i1");
        var obj = {
            name: "sample"
        }
        vdom = new function () {
            var innerObj = obj;
            this._e = input;
            input._vdom = this;
            for(let i = 0; i < input.options.length; i++){
                input.options[i]._vdom = this;
            }
            this.ctx = {
                eval: function (s) {
                    return eval(s);
                }
            };
        }
        const f = inputs._test._buildFunctions(input, vdom.ctx);
        let val = f.extract();
        val.should.eq("string");

        input.selectedIndex = 1;
        val = f.extract();
        val.should.eq(1);

        input.selectedIndex = 2;
        val = f.extract();
        val.should.eq(2.1);

        input.selectedIndex = 3;
        val = f.extract();
        expect(val instanceof Date).to.be.true;
        val.getFullYear().should.eq(2017);
        val.getMonth().should.eq(1);
        val.getDate().should.eq(1);

        input.selectedIndex = 4;
        val = f.extract();
        val.should.eq(obj);
        val.name.should.eq("sample");

        f.update("string")
        input.selectedIndex.should.eq(0);

        f.update(1)
        input.selectedIndex.should.eq(1);

        f.update(2.1)
        input.selectedIndex.should.eq(2);

        f.update(new Date(2017, 1, 1, 0, 0, 0, 0))
        input.selectedIndex.should.eq(3);

        f.update(obj);
        input.selectedIndex.should.eq(4);
    });

    it('Multiple choice', () => {
        document.body.innerHTML = `
            <select id="i1" multiple>
                <option value="string">v1</option>
                <option bind-type="integer">1</option>
                <option bind-type="float(,0)" value="2,1">2,1</option>
                <option bind-type="date(dd/MM/yyyy)" value="01/02/2017">01/02/2017</option>
                <option bind-type="object" value="obj">object</option>
            </select>
        `;
        let input = document.getElementById("i1");
        var obj = {
            name: "sample"
        }
        vdom = new function () {
            var innerObj = obj;
            this._e = input;
            input._vdom = this;
            for(let i = 0; i < input.options.length; i++){
                input.options[i]._vdom = this;
            }
            this.ctx = {
                eval: function (s) {
                    return eval(s);
                }
            };
        }
        const f = inputs._test._buildFunctions(input, vdom.ctx);
        let val = f.extract();
        expect(val instanceof Array).to.be.true;
        val.should.have.lengthOf(0);

        input.options[0].selected = true;
        input.options[3].selected = true;
        val = f.extract();
        expect(val instanceof Array).to.be.true;
        val.should.have.lengthOf(2);
        val[0].should.eq("string");
        expect(val[1] instanceof Date).to.be.true;
        val[1].getFullYear().should.eq(2017);
        val[1].getMonth().should.eq(1);
        val[1].getDate().should.eq(1);

        input.options[0].selected = false;
        input.options[1].selected = true;
        input.options[2].selected = true;
        input.options[3].selected = false;
        input.options[4].selected = true;
        val = f.extract();
        expect(val instanceof Array).to.be.true;
        val.should.have.lengthOf(3);
        val[0].should.eq(1);
        val[1].should.eq(2.1);
        val[2].should.eq(obj);
        val[2].name.should.eq("sample");

        f.update(["string", obj]);
        input.options[0].selected.should.be.true;
        input.options[1].selected.should.be.false;
        input.options[2].selected.should.be.false;
        input.options[3].selected.should.be.false
        input.options[4].selected.should.be.true;

        f.update([1, 2.1, new Date(2017, 01, 01)]);
        input.options[0].selected.should.be.false;
        input.options[1].selected.should.be.true;
        input.options[2].selected.should.be.true;
        input.options[3].selected.should.be.true
        input.options[4].selected.should.be.false;

        f.update([2, 1.2, new Date(1000, 01, 01)]);
        input.options[0].selected.should.be.false;
        input.options[1].selected.should.be.false;
        input.options[2].selected.should.be.false;
        input.options[3].selected.should.be.false
        input.options[4].selected.should.be.false;
    });
    
});