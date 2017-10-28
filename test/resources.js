require('./test');
require('chai').should();
const util = require('../minimojs/util');
const expect = require('chai').expect;
const _ = require('underscore');
const assert = require('assert');
const process = require('process');
const resources = require('../minimojs/resources');



describe('Get resources', function () {
  it('List res folder', () => {
    expect(_.difference(resources.getResourcePaths('./res'), ['./res/file.txt', './res/file2.txt', './res/dir1/fdir1.jsp', './res/dir1/fdir1.html']))
      .to.have.lengthOf(0);
  });

  it('List res folder with filter', () => {
    expect(_.difference(resources.getResourcePaths('./res', r => r.endsWith(".txt")), ['./res/file.txt', './res/file2.txt']))
      .to.have.lengthOf(0);
  });

  it('Read file', () => {
    return resources.readResource('./res/file.txt')
      .then(resource => {
        expect(resource.data).to.be.equal('test123');
        expect(resource.path).to.be.equal('./res/file.txt');
      });
  });

  it('List and get Groupped', () =>
    resources.getResourcePaths("./res").then(res => Promise.all(res.map(resource => resources.readResource(resource))))
    .then(values => _.groupBy(values, resource => resource.path.substring(0, resource.path.lastIndexOf('.'))))
    .then(values => {
      //console.log(`Groupped: ${JSON.stringify(values)}`);
      expect(values['./res/dir1/fdir1']).not.to.be.null;
      expect(values['./res/file']).not.to.be.null;
      expect(values['./res/file2']).not.to.be.null;
    })
  );


  it('List and get groupped with filter', () =>
    resources.getResourcePaths("./res", r => !r.endsWith(".html")).then(res =>
      Promise.all(res.map(resource => resources.readResource(resource))))
    .then(values => _.groupBy(values, resource => resource.path.substring(0, resource.path.lastIndexOf('.'))))
    .then(values => {
      expect(values['./res/dir1/fdir1']).not.to.be.null;
      expect(values['./res/file']).not.to.be.null;
      expect(values['./res/file2']).not.to.be.null;
    })
  );

  it('Get resources', () =>
    resources.getResources("./res")
    .then(values => {
      values.should.deep.include({
        data: "1",
        path: "./res/dir1/fdir1.html"
      });
      values.should.deep.include({
        path: "./res/dir1/fdir1.jsp",
        data: "2"
      });
      values.should.deep.include({
        path: "./res/file.txt",
        data: "test123"
      });
      values.should.deep.include({
        path: "./res/file2.txt",
        data: ""
      });
    })
  );

  it('Get resources with filter', () =>
    resources.getResources("./res", r => r.startsWith("./res/dir1/"))
    .then(values => {
      values.should.deep.include({
        data: "1",
        path: "./res/dir1/fdir1.html"
      });
      values.should.deep.include({
        path: "./res/dir1/fdir1.jsp",
        data: "2"
      });
      values.should.not.deep.include({
        path: "./res/file.txt",
        data: "test123"
      });
      values.should.not.deep.include({
        path: "./res/file2.txt",
        data: ""
      });
    })
  );
  it('Exists', () => resources.exists("./res/dir1/fdir1.html").then(assert));
  it('Doesnt Exist', () => resources.exists("./res/dir1/xasdf.html").then(exists => assert(!exists)));
  it('MkdirTree, ls and RmDirR', () => 
    [resources.mkdirTree("/tmp/testresminimo/test"), resources.mkdirTree("/tmp/testresminimo/test2")].toPromise().then(() => [resources.mkdirTree("/tmp/testresminimo/test/x"), resources.mkdirTree("/tmp/testresminimo/test2/y")].toPromise()).then(() => {
      resources.ls("/tmp/testresminimo").then(list => {
        list.should.have.lengthOf(4);
        return resources.rmDirR("/tmp/testresminimo").then(() => {
          return resources.ls("/tmp/testresminimo").then(list => {
            list.should.have.lengthOf(0);
          })
        })
      })
    }));
});