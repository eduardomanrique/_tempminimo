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
        expect(_.difference(esprimaUtil.getFirstLevelVariables(parsed),
          ['fs', 'system', 'esprima', 'options', 'fnames', 'forceFile', 'count', 'publicVar']))
          .to.have.lengthOf(0);
        expect(_.difference(esprimaUtil.getFirstLevelFunctions(parsed),
          ['showUsage', 'publicFn', 'run']))
          .to.have.lengthOf(0);
      })
  );
});