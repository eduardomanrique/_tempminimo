const expect = require('chai').expect;
require('chai').should();
const _ = require('underscore');
const assert = require('assert');
const EvaluatorManager = require('../minimojs/client/vdom/evaluator-manager.js');

let ctx, ctx1, ctx2, root, l11, l12, l111, l1111;
const ctxManager = {
    listen: () => {}
}

describe('Test Evaluator', () => {
    beforeEach(() => {
        ctx = new function () {
            var o = {
                id: "o"
            }
            var a = 0;
            this.eval = (s) => eval(s);
            this.name = 'ctx';
        };
        ctx1 = ctx.eval(`
            new function(){
                var o1 = {
                    id: "o1"
                }
                var b = 1;
                this.eval = (s) => eval(s);
                this.name = 'ctx1';
            }
        `);
        ctx2 = ctx.eval(`
            new function(){
                var o2 = {
                    id: "o2"
                }
                this.eval = (s) => eval(s);
                this.name = 'ctx2';
            }
        `);
        root = {};
        l11 = {
            parent: root
        };
        l12 = {
            parent: root
        };
        l111 = {
            parent: l11
        };
        l1111 = {
            parent: l111
        };
    })
    it('Test get variables', () => {
        const ev = new EvaluatorManager(ctx, ctxManager);
        ev.build(root);
        var varList = root.ctx.getVariables('a + 1 + this.test + "asdf" + b.cc.dd + (d || c || (e || f)).test + (x ? y : z)').variables;
        varList.should.contain('a');
        varList.should.contain('b');
        varList.should.contain('a');
        varList.should.contain('d');
        varList.should.contain('e');
        varList.should.contain('f');
        varList.should.contain('x');
        varList.should.contain('y');
        varList.should.contain('z');
        varList.should.have.lengthOf(9)
    });

    it('Test var visibility', () => {
        const ev = new EvaluatorManager(ctx, ctxManager);
        ev.build(root);
        ev.build(l11);
        ev.buildWith(l12, ctx2);
        ev.buildWith(l111, ctx1);
        ev.build(l1111);
        root.ctx.eval('a + 1').should.eq(1);
        (() => root.ctx.eval('o1.id + "as"')).should.throw(Error);
        (() => root.ctx.eval('o2.id + "as"')).should.throw(Error);
        root.ctx.eval('o.id + "as"').should.eq("oas");

        l11.ctx.eval('a + 1').should.eq(1);
        (() => l11.ctx.eval('o1.id + "as"')).should.throw(Error);
        (() => l11.ctx.eval('o2.id + "as"')).should.throw(Error);
        l11.ctx.eval('o.id + "as"').should.eq("oas");

        l12.ctx.eval('a + 1').should.eq(1);
        (() => l12.ctx.eval('o1.id + "as"')).should.throw(Error);
        l12.ctx.eval('o2.id + "as"').should.eq("o2as");
        l12.ctx.eval('o.id + "as"').should.eq("oas");

        l1111.ctx.eval('a + 1').should.eq(1);
        l1111.ctx.eval('b + 2').should.eq(3);
        l1111.ctx.eval('o1.id + "as"').should.eq("o1as");
        (() => l1111.ctx.eval('o2.id + "as"')).should.throw(Error);
    });
});