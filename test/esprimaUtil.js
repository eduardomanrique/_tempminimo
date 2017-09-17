require('./test');
require('chai').should();
const expect = require('chai').expect;
const _ = require('underscore');
const assert = require('assert');
const process = require('process');
const resources = require('../minimojs/resources');
const esprimaUtil = require('../minimojs/esprimaUtil');
const esprima = require('esprima');

describe('Test esprima', function() {
  it('Validate first level functions', () =>
    resources.readResource('./forEsprimaValidation.js')
      .then(resource => {
        const parsed = esprima.parse(resource.data);
        const firstLevelVars = esprimaUtil.getFirstLevelVariables(parsed);
        const firstLevelFns = esprimaUtil.getFirstLevelFunctions(parsed);
        console.log(`vars: ${firstLevelVars}`);
        console.log(`functions: ${firstLevelFns}`);
      })
  );
});