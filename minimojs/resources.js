const fs = require('fs');
const pathLib = require('path'); 
const ncp = require('ncp');
const _ = require('underscore');
const logger = require('./logging');

const getResourcePaths = (root, filter) => {
  _getResourcePaths = (rootPath) => new Promise((resolve, reject) => {
    fs.readdir(rootPath, (err, files) => {
      if(err) reject(err);
      else{
        resolve(Promise.all(files.map((path) => {
          const completePath = `${rootPath}/${path}`;
          const isDir = fs.lstatSync(completePath).isDirectory();
          if(isDir){
            return _getResourcePaths(completePath);
          }else{
            return completePath;
          }
        })));
      }
    });
  });
  return _getResourcePaths(root).then(paths => _.flatten(paths).filter(filter || (() => true)));
}

  
   

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

const getResources = (root, filter) => getResourcePaths(root, filter).then(paths => Promise.all(paths.map(readResource)));

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
    resolve(!err ? stats : false);
  }));

module.exports = {
  getResourcePaths: getResourcePaths,
  readResource: readResource,
  getResources: getResources,
  copy: copy,
  getRealPath: getRealPath,
  exists: exists
}