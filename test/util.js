require('./test')
const expect = require('chai').expect;
require('chai').should();
const _ = require('underscore');
const assert = require('assert');
const util = require('../minimojs/util');

describe('Util', () => {
    it('First option', () => util.firstOption([1,2,3]).ifPresent(i => expect(i).to.eq(1)));
    it('First empty option', () => util.firstOption([]).ifPresent(i => assert(false)));
});