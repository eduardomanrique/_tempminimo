const util = require('./util');
const fs = require('fs');
const pathLib = require('path');
const ncp = require('ncp');
const _ = require('underscore');
const mkdirp = require('mkdirp');

const getResourcePaths = (root, filter) => {
  _getResourcePaths = (rootPath) => new Promise((resolve, reject) => {
    fs.readdir(rootPath, (err, files) => {
      if (err) reject(err);
      else {
        resolve(files.map((path) => {
          const completePath = `${rootPath}/${path}`;
          const isDir = fs.lstatSync(completePath).isDirectory();
          if (isDir) {
            return _getResourcePaths(completePath);
          } else {
            return completePath;
          }
        }).toPromise());
      }
    });
  });
  return _getResourcePaths(root).then(paths => _.flatten(paths).filter(filter || (() => true)));
}

const writeFile = (path, data) => new Promise((resolve, reject) => {
  const dir = path.substring(0, path.lastIndexOf("/"));
  exists(dir).then(exists => {
    if(!exists){
      return mkdirTree(dir);
    }
  }).then(() => fs.writeFile(path, data, function (err) {
    if (err) {
      reject(err);
    } else {
      resolve();
    }
  }));
});

const readResource = path =>
  new Promise((resolve, reject) =>
    fs.readFile(path, 'utf8', (err, data) => {
      if (err) {
        logger.error(`Error reading file ${path}: ${err}`);
        reject(err);
      } else {
        resolve({
          data: data,
          path: path
        });
      }
    }));

const getResources = (root, filter) => getResourcePaths(root, filter)
  .then(paths => paths.map(readResource).toPromise())
  .catch(e => [].toPromise());

const copy = (source, dest) =>
  new Promise((resolve, reject) =>
    ncp(source, dest, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    }));

const getRealPath = (path) => `${process.cwd()}${path.startsWith('.') ? path.substring(1) : path}`;

const exists = (path) => new Promise((resolve) =>
  fs.lstat(path, (err, stats) => {
    resolve(!err ? stats : false);
  }));

const pathStats = exists;

const ls = (path) => util.toPromise(fs.readdir, path).then(files => files.map((file) => {
  const result = `${path}/${file}`;
  return pathStats(result).then(stats => {
    if (stats.isDirectory()) {
      return [result, ls(result)].toPromise();
    } else {
      return result;
    }
  })
}).toPromise().then(files => _.flatten(files))).catch(() => []);

const _rmExistingDirR = (path) => util.toPromise(fs.readdir, path).then(files => files.map((file) => {
  const curPath = `${path}/${file}`;
  return pathStats(curPath).then(stats => {
    if (stats.isDirectory()) {
      return _rmExistingDirR(curPath);
    } else {
      return util.toPromise(fs.unlink, curPath);
    }
  });
}).toPromise()).then(() => util.toPromise(fs.rmdir, path));

const rmDirR = (path) => new Promise((resolve, reject) => {
  exists(path).then(exists => {
    if (exists) {
      _rmExistingDirR(path).then(() => resolve(true));
    } else {
      resolve(false);
    }
  });
});

const mkdirTree = (path) => new Promise((resolve, reject) => {
  mkdirp(path, (err) => {
    if (err) {
      reject(err);
    } else {
      resolve();
    }
  });
});

const readModuleFile = (path) => new Promise((resolve, reject) => {
  try {
      const filename = require.resolve(path);
      fs.readFile(filename, 'utf8', (err, data) => {
          if (err) {
              reject(err);
          } else {
              resolve(data);
          }
      });
  } catch (e) {
      reject(e);
  }
});

module.exports = {
  getResourcePaths: getResourcePaths,
  readResource: readResource,
  getResources: getResources,
  copy: copy,
  getRealPath: getRealPath,
  exists: exists,
  writeFile: writeFile,
  rmDirR: rmDirR,
  mkdirTree: mkdirTree,
  ls: ls,
  readModuleFile: readModuleFile
}