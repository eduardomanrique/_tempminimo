const expect = require('chai').expect;
require('chai').should();
const _ = require('underscore');
const assert = require('assert');
const Objects = require('../minimojs/client/objects.js');

const createEvalSet = (obj) => {
    obj.evalSet = (l, r) => {
        global._temp_var_ = r;
        let s = `${l}=global._temp_var_`;
        obj.eval(s);
    };
}

describe('Test Objects', () => {
    it('Test simple var', () => {
        const ctx = new function(){
            var name;
            this.eval = (s) => eval(s);
            createEvalSet(this);
        }
        const value = () => "new name"
        const o = new Objects('name', ctx, value);
        o.updateVariable();
        ctx.eval('name').should.eq("new name");
    });
    it('Test simple object', () => {
        const ctx = new function(){
            var obj;
            this.eval = (s) => eval(s);
            createEvalSet(this);
        }
        const value = () => "new name"
        const o = new Objects('obj.name', ctx, value);
        o.updateVariable();
        const obj = ctx.eval('obj');
        expect(obj).not.to.be.null;
        expect(obj instanceof Array).to.be.false;
        obj.name.should.eq("new name");
    });
    it('Test existing object', () => {
        const ctx = new function(){
            var obj = {
                value: 1
            };
            this.eval = (s) => eval(s);
            createEvalSet(this);
        }
        const value = () => "new name"
        const o = new Objects('obj.name', ctx, value);
        o.updateVariable();
        const obj = ctx.eval('obj');
        expect(obj).not.to.be.null;
        expect(obj instanceof Array).to.be.false;
        obj.name.should.eq("new name");
        obj.value.should.eq(1);
    });
    it('Test object computed', () => {
        const ctx = new function(){
            var obj;
            this.eval = (s) => eval(s);
            createEvalSet(this);
        }
        const value = () => "new name"
        const o = new Objects('obj["name"]', ctx, value);
        o.updateVariable();
        const obj = ctx.eval('obj');
        expect(obj).not.to.be.null;
        expect(obj instanceof Array).to.be.false;
        obj.name.should.eq("new name");
    });
    it('Test object computed with var', () => {
        const ctx = new function(){
            var property = "name";
            var obj;
            this.eval = (s) => eval(s);
            createEvalSet(this);
        }
        const value = () => "new name"
        const o = new Objects('obj[property]', ctx, value);
        o.updateVariable();
        const obj = ctx.eval('obj');
        expect(obj).not.to.be.null;
        expect(obj instanceof Array).to.be.false;
        obj.name.should.eq("new name");
    });
    it('Test array', () => {
        const ctx = new function(){
            var array;
            this.eval = (s) => eval(s);
            createEvalSet(this);
        }
        const value1 = () => "value1";
        const value2 = () => "value2";
        const o1 = new Objects('array[0]', ctx, value1);
        const o2 = new Objects('array[1]', ctx, value2);
        o1.updateVariable();
        o2.updateVariable();
        const array = ctx.eval('array');
        expect(array).not.to.be.null;
        expect(array instanceof Array).to.be.true;
        array.should.have.lengthOf(2);
    });
    it('Test array with var', () => {
        const ctx = new function(){
            var i1 = 0;
            var i2 = 1;
            var array;
            this.eval = (s) => eval(s);
            createEvalSet(this);
        }
        const value1 = () => "value1";
        const value2 = () => "value2";
        const o1 = new Objects('array[i1]', ctx, value1);
        const o2 = new Objects('array[i2]', ctx, value2);
        o1.updateVariable();
        o2.updateVariable();
        const array = ctx.eval('array');
        expect(array).not.to.be.null;
        expect(array instanceof Array).to.be.true;
        array.should.have.lengthOf(2);
    });
    it('Test Complex path', () => {
        const ctx = new function(){
            var i1 = 0;
            var i2 = 1;
            var obj;
            this.eval = (s) => eval(s);
            createEvalSet(this);
        }
        const value1 = () => "value1";
        const value2 = () => "value2";
        const value3 = () => 3;
        const o1 = new Objects('obj.array[i1].name1', ctx, value1);
        const o2 = new Objects('obj.array[i1].name2', ctx, value2);
        const o3 = new Objects('obj.array[i2]', ctx, value3);
        o1.updateVariable();
        o2.updateVariable();
        o3.updateVariable();
        const obj = ctx.eval('obj');
        obj.array.should.have.lengthOf(2);
        obj.array[0].name1.should.eq("value1");
        obj.array[0].name2.should.eq("value2");
        obj.array[1].should.eq(3);
    });
});