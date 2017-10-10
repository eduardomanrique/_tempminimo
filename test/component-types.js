const types = require('../minimojs/component-types').types;
const expect = require('chai').expect;
const assert = require('assert');

describe('Test component types', function () {
    it('Test string', () => {
        expect(types.string.isMandatory()).is.eq(false);
        expect(types.string.defaultValue('1').isMandatory()).is.eq(false);
        expect(types.string.defaultValue('1').equivalent(types.string)).is.eq(true);
        expect(types.string.hasDefaultValue()).is.eq(false);
        expect(types.string.defaultValue('1').hasDefaultValue()).is.eq(true);
        expect(types.mandatory.string.isMandatory()).is.eq(true);
        expect(types.mandatory.string.defaultValue('1').isMandatory()).is.eq(true);
        expect(types.mandatory.string.defaultValue('1').equivalent(types.string)).is.eq(true);
        expect(types.mandatory.string.hasDefaultValue()).is.eq(false);
        expect(types.mandatory.string.defaultValue('1').hasDefaultValue()).is.eq(true);

        expect(types.string.equivalent(types.mandatory.string)).is.eq(true);
        expect(types.string.equivalent(types.number)).is.eq(false);
        expect(types.string.equivalent(types.bool)).is.eq(false);
        expect(types.string.equivalent(types.boundVariable)).is.eq(false);
        expect(types.string.equivalent(types.innerHTML)).is.eq(false);
        expect(types.string.equivalent(types.script)).is.eq(false);
        expect(types.string.equivalent(types.bind)).is.eq(false);
        expect(types.string.equivalent(types.any)).is.eq(false);
        expect(types.string.equivalent(types.mandatory.number)).is.eq(false);
        expect(types.string.equivalent(types.mandatory.bool)).is.eq(false);
        expect(types.string.equivalent(types.mandatory.boundVariable)).is.eq(false);
        expect(types.string.equivalent(types.mandatory.innerHTML)).is.eq(false);
        expect(types.string.equivalent(types.mandatory.script)).is.eq(false);
        expect(types.string.equivalent(types.mandatory.bind)).is.eq(false);
        expect(types.string.equivalent(types.mandatory.any)).is.eq(false);

        expect(types.string.defaultValue('a').getDefaultValue()).is.eq('a');
        expect(types.mandatory.string.defaultValue('a').getDefaultValue()).is.eq('a');

        expect(types.string.convert('a')).is.eq('a');
    });

    it('Test number', () => {
        expect(types.number.isMandatory()).is.eq(false);
        expect(types.number.defaultValue('1').isMandatory()).is.eq(false);
        expect(types.number.defaultValue('1').equivalent(types.number)).is.eq(true);
        expect(types.number.hasDefaultValue()).is.eq(false);
        expect(types.number.defaultValue('1').hasDefaultValue()).is.eq(true);
        expect(types.mandatory.number.isMandatory()).is.eq(true);
        expect(types.mandatory.number.defaultValue('1').isMandatory()).is.eq(true);
        expect(types.mandatory.number.defaultValue('1').equivalent(types.number)).is.eq(true);
        expect(types.mandatory.number.hasDefaultValue()).is.eq(false);
        expect(types.mandatory.number.defaultValue('1').hasDefaultValue()).is.eq(true);
        try{
            types.mandatory.number.defaultValue('a');
            assert(false, 'Line should not be called');
        }catch(e){
            expect(e.message).is.eq('Invalid value a for number');
        }
        expect(types.number.equivalent(types.mandatory.number)).is.eq(true);
        expect(types.number.equivalent(types.bool)).is.eq(false);
        expect(types.number.equivalent(types.boundVariable)).is.eq(false);
        expect(types.number.equivalent(types.innerHTML)).is.eq(false);
        expect(types.number.equivalent(types.script)).is.eq(false);
        expect(types.number.equivalent(types.bind)).is.eq(false);
        expect(types.number.equivalent(types.any)).is.eq(false);
        expect(types.number.equivalent(types.mandatory.bool)).is.eq(false);
        expect(types.number.equivalent(types.mandatory.boundVariable)).is.eq(false);
        expect(types.number.equivalent(types.mandatory.innerHTML)).is.eq(false);
        expect(types.number.equivalent(types.mandatory.script)).is.eq(false);
        expect(types.number.equivalent(types.mandatory.bind)).is.eq(false);
        expect(types.number.equivalent(types.mandatory.any)).is.eq(false);

        expect(types.number.defaultValue(1.1).getDefaultValue()).is.eq(1.1);
        expect(types.mandatory.number.defaultValue(2).getDefaultValue()).is.eq(2);

        expect(types.number.convert('2.2')).is.eq(2.2);
    });

    it('Test bool', () => {
        expect(types.bool.isMandatory()).is.eq(false);
        expect(types.bool.defaultValue('true').isMandatory()).is.eq(false);
        expect(types.bool.defaultValue('false').equivalent(types.bool)).is.eq(true);
        expect(types.bool.hasDefaultValue()).is.eq(false);
        expect(types.bool.defaultValue('false').hasDefaultValue()).is.eq(true);
        expect(types.mandatory.bool.isMandatory()).is.eq(true);
        expect(types.mandatory.bool.defaultValue('true').isMandatory()).is.eq(true);
        expect(types.mandatory.bool.defaultValue('true').equivalent(types.bool)).is.eq(true);
        expect(types.mandatory.bool.hasDefaultValue()).is.eq(false);
        expect(types.mandatory.bool.defaultValue('false').hasDefaultValue()).is.eq(true);
        try{
            types.mandatory.bool.defaultValue('a');
            assert(false, 'Line should not be called');
        }catch(e){
            expect(e.message).is.eq('Invalid value a for bool');
        }

        expect(types.bool.equivalent(types.mandatory.bool)).is.eq(true);
        expect(types.bool.equivalent(types.boundVariable)).is.eq(false);
        expect(types.bool.equivalent(types.innerHTML)).is.eq(false);
        expect(types.bool.equivalent(types.script)).is.eq(false);
        expect(types.bool.equivalent(types.bind)).is.eq(false);
        expect(types.bool.equivalent(types.any)).is.eq(false);
        expect(types.bool.equivalent(types.mandatory.boundVariable)).is.eq(false);
        expect(types.bool.equivalent(types.mandatory.innerHTML)).is.eq(false);
        expect(types.bool.equivalent(types.mandatory.script)).is.eq(false);
        expect(types.bool.equivalent(types.mandatory.bind)).is.eq(false);
        expect(types.bool.equivalent(types.mandatory.any)).is.eq(false);
    });

    it('Test boundVariable', () => {
        expect(types.boundVariable.isMandatory()).is.eq(false);
        expect(types.boundVariable.defaultValue('_a').isMandatory()).is.eq(false);
        expect(types.boundVariable.defaultValue('a.b').equivalent(types.boundVariable)).is.eq(true);
        expect(types.boundVariable.hasDefaultValue()).is.eq(false);
        expect(types.boundVariable.defaultValue('$').hasDefaultValue()).is.eq(true);
        expect(types.mandatory.boundVariable.isMandatory()).is.eq(true);
        expect(types.mandatory.boundVariable.defaultValue('a.a.c').isMandatory()).is.eq(true);
        expect(types.mandatory.boundVariable.defaultValue('aa.test').equivalent(types.boundVariable)).is.eq(true);
        expect(types.mandatory.boundVariable.hasDefaultValue()).is.eq(false);
        expect(types.mandatory.boundVariable.defaultValue('asdf').hasDefaultValue()).is.eq(true);

        try{
            types.mandatory.boundVariable.defaultValue('1');
            assert(false, 'Line should not be called');
        }catch(e){
            expect(e.message).is.eq('Invalid value 1 for boundVariable');
        }
        try{
            types.mandatory.boundVariable.defaultValue('a a');
            assert(false, 'Line should not be called');
        }catch(e){
            expect(e.message).is.eq('Invalid value a a for boundVariable');
        }
        try{
            types.mandatory.boundVariable.defaultValue('a .a.');
            assert(false, 'Line should not be called');
        }catch(e){
            expect(e.message).is.eq('Invalid value a .a. for boundVariable');
        }

        expect(types.boundVariable.equivalent(types.mandatory.boundVariable)).is.eq(true);
        expect(types.boundVariable.equivalent(types.innerHTML)).is.eq(false);
        expect(types.boundVariable.equivalent(types.script)).is.eq(false);
        expect(types.boundVariable.equivalent(types.bind)).is.eq(false);
        expect(types.boundVariable.equivalent(types.any)).is.eq(false);
        expect(types.boundVariable.equivalent(types.mandatory.innerHTML)).is.eq(false);
        expect(types.boundVariable.equivalent(types.mandatory.script)).is.eq(false);
        expect(types.boundVariable.equivalent(types.mandatory.bind)).is.eq(false);
        expect(types.boundVariable.equivalent(types.mandatory.any)).is.eq(false);
    });

    it('Test innerHtml', () => {
        expect(types.innerHTML.isMandatory()).is.eq(false);
        expect(types.innerHTML.defaultValue('<test>a</test>').isMandatory()).is.eq(false);
        expect(types.innerHTML.defaultValue('abc').equivalent(types.innerHTML)).is.eq(true);
        expect(types.innerHTML.hasDefaultValue()).is.eq(false);
        expect(types.innerHTML.defaultValue('<br>').hasDefaultValue()).is.eq(true);
        expect(types.mandatory.innerHTML.isMandatory()).is.eq(true);
        expect(types.mandatory.innerHTML.defaultValue('c').isMandatory()).is.eq(true);
        expect(types.mandatory.innerHTML.defaultValue('1234').equivalent(types.innerHTML)).is.eq(true);
        expect(types.mandatory.innerHTML.hasDefaultValue()).is.eq(false);
        expect(types.mandatory.innerHTML.defaultValue('asdf1234').hasDefaultValue()).is.eq(true);

        expect(types.innerHTML.equivalent(types.mandatory.innerHTML)).is.eq(true);
        expect(types.innerHTML.equivalent(types.script)).is.eq(false);
        expect(types.innerHTML.equivalent(types.bind)).is.eq(false);
        expect(types.innerHTML.equivalent(types.any)).is.eq(false);
        expect(types.innerHTML.equivalent(types.mandatory.script)).is.eq(false);
        expect(types.innerHTML.equivalent(types.mandatory.bind)).is.eq(false);
        expect(types.innerHTML.equivalent(types.mandatory.any)).is.eq(false);
    });

    it('Test script', () => {
        expect(types.script.isMandatory()).is.eq(false);
        expect(types.script.defaultValue('1').isMandatory()).is.eq(false);
        expect(types.script.defaultValue('a').equivalent(types.script)).is.eq(true);
        expect(types.script.hasDefaultValue()).is.eq(false);
        expect(types.script.defaultValue('1').hasDefaultValue()).is.eq(true);
        expect(types.mandatory.script.isMandatory()).is.eq(true);
        expect(types.mandatory.script.defaultValue('1').isMandatory()).is.eq(true);
        expect(types.mandatory.script.defaultValue('c').equivalent(types.script)).is.eq(true);
        expect(types.mandatory.script.hasDefaultValue()).is.eq(false);
        expect(types.mandatory.script.defaultValue('1').hasDefaultValue()).is.eq(true);

        expect(types.script.equivalent(types.mandatory.script)).is.eq(true);
        expect(types.script.equivalent(types.bind)).is.eq(false);
        expect(types.script.equivalent(types.any)).is.eq(false);
        expect(types.script.equivalent(types.mandatory.bind)).is.eq(false);
        expect(types.script.equivalent(types.mandatory.any)).is.eq(false);
    });

    it('Test bind', () => {
        expect(types.bind.isMandatory()).is.eq(false);
        expect(types.bind.defaultValue('_a').isMandatory()).is.eq(false);
        expect(types.bind.defaultValue('a.b').equivalent(types.bind)).is.eq(true);
        expect(types.bind.hasDefaultValue()).is.eq(false);
        expect(types.bind.defaultValue('$').hasDefaultValue()).is.eq(true);
        expect(types.mandatory.bind.isMandatory()).is.eq(true);
        expect(types.mandatory.bind.defaultValue('a.a.c').isMandatory()).is.eq(true);
        expect(types.mandatory.bind.defaultValue('aa.test').equivalent(types.bind)).is.eq(true);
        expect(types.mandatory.bind.hasDefaultValue()).is.eq(false);
        expect(types.mandatory.bind.defaultValue('asdf').hasDefaultValue()).is.eq(true);

        try{
            types.mandatory.bind.defaultValue('1');
            assert(false, 'Line should not be called');
        }catch(e){
            expect(e.message).is.eq('Invalid value 1 for bind');
        }
        try{
            types.mandatory.bind.defaultValue('a a');
            assert(false, 'Line should not be called');
        }catch(e){
            expect(e.message).is.eq('Invalid value a a for bind');
        }
        try{
            types.mandatory.bind.defaultValue('a .a.');
            assert(false, 'Line should not be called');
        }catch(e){
            expect(e.message).is.eq('Invalid value a .a. for bind');
        }

        expect(types.bind.equivalent(types.mandatory.bind)).is.eq(true);
        expect(types.bind.equivalent(types.innerHTML)).is.eq(false);
        expect(types.bind.equivalent(types.script)).is.eq(false);
        expect(types.bind.equivalent(types.any)).is.eq(false);
        expect(types.bind.equivalent(types.mandatory.innerHTML)).is.eq(false);
        expect(types.bind.equivalent(types.mandatory.script)).is.eq(false);
        expect(types.bind.equivalent(types.mandatory.any)).is.eq(false);
    });

    it('Test any', () => {
        expect(types.any.isMandatory()).is.eq(false);
        expect(types.any.defaultValue('1').isMandatory()).is.eq(false);
        expect(types.any.defaultValue('1').equivalent(types.any)).is.eq(true);
        expect(types.any.hasDefaultValue()).is.eq(false);
        expect(types.any.defaultValue('a').hasDefaultValue()).is.eq(true);
        expect(types.mandatory.any.isMandatory()).is.eq(true);
        expect(types.mandatory.any.defaultValue('new Date()').isMandatory()).is.eq(true);
        expect(types.mandatory.any.defaultValue('1').equivalent(types.any)).is.eq(true);
        expect(types.mandatory.any.hasDefaultValue()).is.eq(false);
        expect(types.mandatory.any.defaultValue('1').hasDefaultValue()).is.eq(true);

        expect(types.any.equivalent(types.mandatory.any)).is.eq(true);
    });
});  