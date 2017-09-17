require('chai').should();
const expect = require('chai').expect;
const _ = require('underscore');
const assert = require('assert');
const process = require('process');
const resources = require('../minimojs/resources');


beforeEach(() => {
  const workingDir = `${__dirname}/datadir`;
  //console.log(`Setting working dir to ${workingDir}`);
  process.chdir(workingDir);
})
let a;
describe('Get resources', function() {
  it('Test 1', () => {
    let x;
    let y;
    new Promise((resolve, reject) => resolve({x: 1, y: 2})).then(val => {
      ({x, y} = val);
      console.log(`x: ${x}, y: ${y}`);
    });

  });

  it('Test 2', () => {
  });

  it('xx', () =>
    resources.getResources("./res")
    .then(values =>
      _.mapObject(_.groupBy(values, resource => resource.path.substring(0, resource.path.lastIndexOf('.'))), (v, k) => {
        let result = {};
        v.forEach(item => {
          let ext = item.path.substring(item.path.lastIndexOf('.')+1);
          if(ext == 'html' || ext == 'js' || ext == 'txt'){
            result[ext] = item.data;
          }
        });
        console.log(`::::${JSON.stringify(result)}`);
        return result;
      })
    )
    .then(values => {
      console.log(`${JSON.stringify(values)}`);
      console.log(typeof(values))
    })
  );
});