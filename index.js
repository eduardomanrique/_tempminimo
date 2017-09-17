const logger = require('./minimojs/logging');
const process = require('process');
const fs = require('fs');
const path = require('path');
const propertyReader = require('properties-reader');
const ctx = require('./minimojs/context');
const components = require('./minimojs/components');
const yargs = require('yargs');

const argv = yargs
  .option('destination', {
    alias: 'd',
    describe: 'Destination folder'
  })
  .option('localaccess', {
    alias: 'l',
    describe: 'Indicates if htmls will be acessed from file protocol',
    default: ['n'],
    choices: ['y', 'n']
  })
  .option('devmode', {
    alias: 'm',
    describe: 'Indicates if is running in development env',
    default: ['n'],
    choices: ['y', 'n']
  })
  .help()
  .argv


const properties = propertyReader('min.properties');

logger.info('Minimojs');

const currentPath = path.dirname(fs.realpathSync(__filename));
ctx.devMode = argv.devmode == 'y';
ctx.contextPath = properties.get('contextpath');
ctx.localAccess = argv.localaccess;
const destFolderPath = argv.destination;

const getRealPath = (path) => `${destFolderPath}/${path}`;

logger.info(`contextPath: ${contextPath}\ncurrentPath: ${currentPath}\ndevMode: ${ctx.devMode}\ndestination folder: ${destFolderPath}`);

components.load();
  //XObjectsManager.instance.init(); services e afins
  //XResourceManager.instance.init(baseDestPath);
