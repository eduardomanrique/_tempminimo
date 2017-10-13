require('./test')
const expect = require('chai').expect;
require('chai').should();
const _ = require('underscore');
const assert = require('assert');
const util = require('../minimojs/util');

describe('Util', () => {
    it('Get module as string', () => util.readModuleFile('./component-types.js').then((data) => {
        expect(data.length).to.be.greaterThan(100);
    }));
    it('Option with promise should not call function', () => 
        util.emptyOption().then(() => assert(true, 'Should not be called')));
    it('Option with promise should call function', () => 
        util.optionOf(1).then((v) => assert(v == 1, 'Should be called and v should be 1')));
});