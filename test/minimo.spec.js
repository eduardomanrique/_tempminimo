require('./test');
require('chai').should();
const expect = require('chai').expect;
const _ = require('underscore');
const assert = require('assert');
const minimo = require('../minimojs/minimo');
const resources = require('../minimojs/resources');

// describe('Minimo', function () {
//   it('Test minimo', () => {
//     // let parameters = {
//     //     workingFolder: `${__dirname}/datadir`,
//     //     defaultTemplate: 'tpl.htmx',
//     //     destinationPath: '/tmp/minimojs_final_test'
//     // }
//     // return minimo.generateMinimoJs(parameters).then(() => resources.rmDirR(parameters.destinationPath));
//   });
// });