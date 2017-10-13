const fs = require('fs');
const pathLib = require('path'); 
const ncp = require('ncp');
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

const writeFile = (path, data) =>
  new Promise((resolve, reject) =>
    fs.writeFile(path, data, function(err) {
      if(err) {
          reject(err);
      }else{
        resolve();
      }
    })); 

const readResource = path =>
  new Promise((resolve, reject) =>
    fs.readFile(path, 'utf8', (err, data) => {
      if (err) {
        logger.error(`Error reading file ${path}: ${err}`);
        reject(err);
      } else {
        resolve({data: data, path: path});
      }
    }));

const getResources = (root, filter) => Promise.all(getResourcePaths(root, filter).map(readResource))

const copy = (source, dest) => 
  new Promise((resolve, reject) => 
    ncp(source, dest, (err) => {
      if (err) {
        reject(err);
      }else{
        resolve();
      }
    }));

const getRealPath = (path) => `${process.cwd()}${path.startsWith('.') ? path.substring(1) : path}`;

const exists = (path) => new Promise((resolve) => 
  fs.lstat(path, (err, stats) => {
    resolve(!err || err.code != 'ENOENT');
  }));

module.exports = {
  getResourcePaths: getResourcePaths,
  readResource: readResource,
  getResources: getResources,
  copy: copy,
  getRealPath: getRealPath,
  exists: exists
}