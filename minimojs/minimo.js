const compiler = require('./compiler');
const resources = require('./resources');
const components = require('./components');
const context = require('./context');
const fs = require('fs');
const browserify = require('browserify');

const generateMinimoJs = (parameters) => {
    process.chdir(parameters.workingFolder);
    compiler.setParameters({
        defaultTemplate: parameters.defaultTemplate
    });
    context.destinationPath = parameters.destinationPath;
    let importableResources;

    return resources.readModuleFile('./defaultLoaderGif.txt').then((loader) => {
        const _copyResource = (path, destName) => resources.readModuleFile(`./client/${path}`)
            .then(data => resources.writeFile(`${parameters.destinationPath}/m/scripts/${destName || path}`, data
                .replace('"%importableResources%"', JSON.stringify(importableResources))
                .replace('"%component-types%"', components.getComponentTypes())
                .replace('"%components%"', components.getScripts())
                .replace('"%devmode%"', parameters.devMode == true)
                .replace('"%__setUpGetterForAttributes%"', components.getSetUpGetterForAttributesScript())
                .replace('"%loader.gif%"', loader)));

        return Promise.all([resources.mkdirTree(context.destinationPath), resources.mkdirTree(`${parameters.destinationPath}/m/scripts`)])
            .then(() => components.startComponents())
            .then(() => compiler.compileResources())
            .then(importable => importableResources = importable)
            .then(() => Promise.all([
                resources.readModuleFile(`../node_modules/minimojs-options/index.js`).then(data => resources.writeFile(`${parameters.destinationPath}/m/minimojs-options.js`, data)),
                _copyResource('esprima.js'),
                _copyResource('../../node_modules/minimojs-misc/index.js', 'minimojs-misc'),
                _copyResource('pubsub.js'),
                _copyResource('remote.js'),
                _copyResource('objects.js'),
                _copyResource('mutation-manager.js'),
                _copyResource('minimo-instance.js'),
                _copyResource('minimo-events.js'),
                _copyResource('importable-resources.js'),
                _copyResource('dom.js'),
                _copyResource('modals.js'),
                _copyResource('components.js'),
                _copyResource('cached-resources.js'),
                _copyResource('vdom/context-manager.js'),
                _copyResource('vdom/evaluator.js'),
                _copyResource('vdom/inputs.js'),
                _copyResource('vdom/virtualdom.js')
            ]))
            .then(() => new Promise(r => {
                setTimeout(r, 3000);//TODO workaround...
                browserify(`${parameters.destinationPath}/m/scripts/minimo-instance.js`)
                    .bundle()
                    .on('error', (err) => {
                        console.log(err.message)
                        console.log("ERROR!!! " + JSON.stringify(err))
                        console.log(err.stack);
                    }).pipe(fs.createWriteStream(`${parameters.destinationPath}/m/scripts/m.js`));
            }))
            .catch(reason => {
                console.log(reason.message);
                console.trace(reason);
                throw reason;
            })
    });
}



module.exports = {
    generateMinimoJs: generateMinimoJs
}