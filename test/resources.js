require('./test')
require('chai').should();
const expect = require('chai').expect;
const _ = require('underscore');
const assert = require('assert');
const process = require('process');
const resources = require('../minimojs/resources');



describe('Get resources', function() {
  it('List components folder', () => {
    expect(_.difference(resources.getResourcePaths('./components'), ['./components/file.txt', './components/file2.txt', './components/dir1/fdir1.js', './components/dir1/fdir1.html']))
      .to.have.lengthOf(0);
  });

  it('List components folder with filter', () => {
    expect(_.difference(resources.getResourcePaths('./components', r => r.endsWith(".txt")), ['./components/file.txt', './components/file2.txt']))
      .to.have.lengthOf(0);
  });

  it('Read file', () => {
    return resources.readResource('./components/file.txt')
      .then(resource => {
        expect(resource.data).to.be.equal('test123');
        expect(resource.path).to.be.equal('./components/file.txt');
      });
  });

  it('List and get groupped', () =>
    Promise.all(resources.getResourcePaths("./components").map(resource => resources.readResource(resource)))
    .then(values => _.groupBy(values, resource => resource.path.substring(0, resource.path.lastIndexOf('.'))))
    .then(values => {
      console.log(`Groupped: ${JSON.stringify(values)}`);
      expect(values['./components/dir1/fdir1']).not.to.be.null;
      expect(values['./components/file']).not.to.be.null;
      expect(values['./components/file2']).not.to.be.null;
    })
  );


  it('List and get groupped with filter', () =>
    Promise.all(resources.getResourcePaths("./components", r => !r.endsWith(".html"))
      .map(resource => resources.readResource(resource)))
    .then(values => _.groupBy(values, resource => resource.path.substring(0, resource.path.lastIndexOf('.'))))
    .then(values => {
      expect(values['./components/dir1/fdir1']).not.to.be.null;
      expect(values['./components/file']).not.to.be.null;
      expect(values['./components/file2']).not.to.be.null;
    })
  );

  it('Get resources', () =>
    resources.getResources("./components")
    .then(values => {
      values.should.deep.include({
        data: "1",
        path: "./components/dir1/fdir1.html"
      });
      values.should.deep.include({
        path: "./components/dir1/fdir1.js",
        data: "2"
      });
      values.should.deep.include({
        path: "./components/file.txt",
        data: "test123"
      });
      values.should.deep.include({
        path: "./components/file2.txt",
        data: ""
      });
    })
  );

  it('Get resources with filter', () =>
    resources.getResources("./components", r => r.startsWith("./components/dir1/"))
    .then(values => {
      values.should.deep.include({
        data: "1",
        path: "./components/dir1/fdir1.html"
      });
      values.should.deep.include({
        path: "./components/dir1/fdir1.js",
        data: "2"
      });
      values.should.not.deep.include({
        path: "./components/file.txt",
        data: "test123"
      });
      values.should.not.deep.include({
        path: "./components/file2.txt",
        data: ""
      });
    })
  );
});
