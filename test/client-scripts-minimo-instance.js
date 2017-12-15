const expect = require('chai').expect;
require('chai').should();
const _ = require('underscore');
const assert = require('assert');
const jsdom = require('mocha-jsdom');

global.window = {
    location: {
        pathname: ''
    },
    addEventListener: (fn) => {
        
    }
};

const minimoInstance = require('../minimojs/client/minimo-instance');