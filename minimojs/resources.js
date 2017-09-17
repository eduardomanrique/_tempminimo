const fs = require('fs');
const _ = require('underscore');
const logger = require('./logging');

const getResourcePaths = (root, filter) =>
   _.flatten(fs.readdirSync(root)
    .map((path) => {
      const completePath = `${root}/${path}`;
      const isDir = fs.lstatSync(completePath).isDirectory();
      if(isDir){
        return getResourcePaths(completePath);
      }else{
        return completePath;
      }
    })
  ).filter(filter || (() => true))


const readResource = path =>
  new Promise(function(resolve, reject) {
    fs.readFile(path, 'utf8', function (err, data) {
      if (err) {
        logger.error(`Error reading file ${path}: ${err}`);
        reject(err);
      } else {
        resolve({data: data, path: path});
      }
    });
  });

const getResources = (root, filter) => Promise.all(getResourcePaths(root, filter).map(readResource))

module.exports = {
  getResourcePaths: getResourcePaths,
  readResource: readResource,
  getResources: getResources
}