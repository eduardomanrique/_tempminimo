const process = require('process');
const fs = require('fs');
const path = require('path');
const propertyReader = require('properties-reader');
const yargs = require('yargs');
const minimo = require('./minimojs/minimo');

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
    default: ['production'],
    choices: ['d', 'devlopment', 'p', 'production']
  })
  .option('working-folder', {
    alias: 'w',
    describe: 'Working folder'
  })
  .option('default-template', {
    alias: 't',
    describe: 'Default template'
  })
  .help()
  .argv

minimo.generateMinimoJs({
  workingFolder: argv['working-folder'],
  defaultTemplate: argv['default-template'],
  destinationPath: argv.destination,
  devMode: argv.devmode == 'd' || argv.devmode == 'development'
}).then(() => console.log('success')).catch(()=>console.error('error'));