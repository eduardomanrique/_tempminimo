require('./test');
require('chai').should();
const rewire = require('rewire');
const expect = require('chai').expect;
const _ = require('underscore');
const assert = require('assert');
const process = require('process');
const htmlParser = require('../minimojs/htmlParser');
const _htmlParser = rewire('../minimojs/htmlParser');



describe('Test html parser', function() {
  it('Test private functions', () => {
      let textWitScript = _htmlParser.__get__('_prepareXScriptsValues')('Test 123 ${fn(1,2,"3") + "x"}, lorem');
	  expect(textWitScript).is.equal('Test 123 <xscr scr="fn(1,2,&quot;3&quot;) + &quot;x&quot;"></xscr>, lorem');
	//_htmlParser._isEmptyText
	  expect(_htmlParser.__get__('_eqIgnoreCase')('asdf', 'ASdf')).is.equal(true);
	  expect(_htmlParser.__get__('_validateJS')('var a = 1;')).is.equal(true);
	  expect(_htmlParser.__get__('_validateJS')('var a s s')).is.equal(false);
  });
});
