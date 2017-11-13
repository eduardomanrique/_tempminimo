const expect = require('chai').expect;
require('chai').should();
const _ = require('underscore');
const assert = require('assert');
const Evaluator = require('../minimojs/client/evaluator.js').Evaluator;

describe('Test Evaluator', () => {
    it('Test get variables', () => {
        var eval = new Evaluator();
        var varList = eval._getVariables('a + 1 + this.test + "asdf" + b.cc.dd + (d || c || (e || f)).test + (x ? y : z)');
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

    it('Run with contexts', () => {
        var ca = new function(){
            var a1 = {
                a: 2,
                x: 3
            }
            var a2 = 4;
            this.eval = function(s){
                return eval(s);
            }
        }
        var cb = new function(){
            var b1 = {
                x: {
                    c: 10
                }
            }
            this.eval = function(s){
                return eval(s);
            }
        }
        var cc = new function(){
            var c1 = 100;
            var a2 = 150;
            this.eval = function(s){
                return eval(s);
            }
        }
        var _eval = new Evaluator();
        var result = _eval.eval('a1.a + b1.x.c + a2 + c1 + a1.x', [ca, cb, cc]);
        result.should.eq(119);
    });
});