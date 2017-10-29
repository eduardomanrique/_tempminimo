require('./test')
const expect = require('chai').expect;
require('chai').should();
const _ = require('underscore');
const assert = require('assert');
const util = require('../minimojs/util');
const context = require('../minimojs/context');
const resources = require('../minimojs/resources');
const components = require('../minimojs/components');
const compiler = require('../minimojs/compiler');
const clientScripts = require('../minimojs/client-scripts');

describe('Client scripts', () => {
    before(() => context.destinationPath = `/tmp/minimojs_test`);
    beforeEach(() => resources.rmDirR(context.destinationPath)
        .then(() => resources.mkdirTree(context.destinationPath)));
    afterEach(() => resources.rmDirR(context.destinationPath));

    it('Load minimo.js', () => components.startComponents()
        .then(compiler.compileResources)
        .then(clientScripts.reload)
        .then(minimoJs => console.log(minimoJs)));
});