require('./test');
const compiler = require('../minimojs/compiler');
require('chai').should();
const expect = require('chai').expect;

describe('Test html parser', function () {
    it('Get resource info htmx/js OK', () => compiler._restart()
        .then(() => compiler._getResourceInfo('/dir1/test1.htmx', false)
            .then(resourceOption => {
                expect(resourceOption.isPresent()).to.be.true;
                resourceOption.ifPresent(resource => {
                    resource.relativePath.should.equal('./pages/dir1/test1.htmx');
                    resource.relativeJsPath.should.equal('./pages/dir1/test1.js');
                    expect(resource.templateName).to.be.null;
                    expect(resource.global).to.be.false;
                    expect(resource.jsOnly).to.be.false;
                });
            })));
    it('Get resource info htmx/js Non existent', () => compiler._restart()
        .then(() => compiler._getResourceInfo('/testqq1.htmx', false)
            .then(resourceOption => {
                expect(resourceOption.isPresent()).to.be.false;
            })));
    it('Get resource info htmx/js dir name, Non existent', () => compiler._restart()
        .then(() => compiler._getResourceInfo('/dir1.htmx', false)
            .then(resourceOption => {
                expect(resourceOption.isPresent()).to.be.false;
            })));
    it('Get resource info htmx/js dir name OK', () => compiler._restart()
        .then(() => compiler._getResourceInfo('/dir1/test1.htmx', false)
            .then(resourceOption => {
                expect(resourceOption.isPresent()).to.be.true;
                resourceOption.ifPresent(resource => {
                    // resource.relativePath.should.equal('./pages/dirtest1.htmx');
                    // resource.relativeJsPath.should.equal('./pages/test1.js');
                    // expect(resource.templateName).to.be.null;
                    // expect(resource.global).to.be.false;
                    // expect(resource.jsOnly).to.be.false;
                });
            })));
    //get resource empty
    // _reloadHtmxFile com mock
    //_reloadTemplate com mock?
    //_addChildValidElements ?
    //_compilePage com mock?
    //_buildComponents

});