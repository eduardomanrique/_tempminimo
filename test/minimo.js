require('./test');
require('chai').should();
const expect = require('chai').expect;
const _ = require('underscore');
const assert = require('assert');
const minimo = require('../minimojs/minimo');

describe('Minimo', function () {
  it('Test minimo', () => {
    return minimo.generateMinimoJs({
        workingFolder: `${__dirname}/datadir`,
        defaultTemplate: 'tpl.htmx',
        destinationPath: '/tmp/minimojs_final_test'
    }).then(() => {
        console.log(1)
    });
  });
});