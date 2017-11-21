require('./test')
const chai = require('chai');
const expect = chai.expect;
require('chai').should();
const spies = require('chai-spies');
chai.use(spies);
const _ = require('underscore');
const assert = require('assert');
const ContextManager = require('../minimojs/client/vdom/context-manager');

function createVDom(id){
    return {
        _id: id,
        update: chai.spy(function(){
        })
    }
}

describe('VDom Context manager', () => {
    it('Test error', () => {
        const cm = new ContextManager();
        const c1 = {};
        const c2 = {};
        cm.add(c1);
        cm.add(c2);
        (() => cm.add(c1)).should.throw(Error);
    });

    it('Remove ctx', () => {
        const cm = new ContextManager();
        const c1 = {};
        const c2 = {};
        cm.add(c1);
        cm.add(c2);
        cm.remove(c1);
        cm.add(c1);
        (() => cm.add(c2)).should.throw(Error);
    });

    it('Listen to var change', () => {
        const cm = new ContextManager();
        const c1 = {};
        const c2 = {};
        const v1 = createVDom(1);
        const v2 = createVDom(2);
        const v3 = createVDom(3);
        cm.add(c1);
        cm.add(c2);
        cm.listen(c1, 'a', v1);
        cm.listen(c1, 'a', v2);
        cm.listen(c1, 'b', v1);
        cm.listen(c2, 'a', v1);
        cm.listen(c1, 'b', v3);
        cm.varChanged(c1, 'a');
        cm.varChanged(c1, 'b');
        cm.varChanged(c2, 'b');
        v1.update.should.have.been.called.twice;
        v2.update.should.have.been.called.once;
        v3.update.should.have.been.called.once;
        cm.varChanged(c2, 'a');
        v1.update.should.have.been.called.exactly(3);
        cm.vdomRemoved(v1);
        cm.varChanged(c1, 'a');
        cm.varChanged(c2, 'a');
        v1.update.should.have.been.called.exactly(3);
        v2.update.should.have.been.called.twice;
    });
});