require('./test')
const expect = require('chai').expect;
require('chai').should();
const _ = require('underscore');
const assert = require('assert');
const util = require('../minimojs/util');

describe('Util', function() {
    it('Get module as string', () => util.readModuleFile('./component-types.js').then((data) => {
        expect(data.length).to.be.greaterThan(100);
    }));
});