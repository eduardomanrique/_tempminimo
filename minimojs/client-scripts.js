const resources = require('./resources');
const components = require('./components');
const context = require('./context');
const util = require('./util');
const _ = require('underscore');
const fs = require('fs');

let minimoJs;

const clientResources = ['comptypes', 'components', 'defaultservices', 'dom', 'events', 'inputs', 'log', 'mask', 'obj',
    'remote', 'util', 'visual', 'autocomplete', 'resources'];

const reload = (importableResources) => 
    [clientResources.map(resourceName => [resourceName, resources.readModuleFile(`./client/${resourceName}`)].toPromise())].toPromise()
        .then(modules => modules.map(pair => {
            return {
                name: pair[0],
                data: pair[1]
            }
        }))
        .then(modules => resources.readModuleFile("./client/m.js")
        .then(mainJs => minimoJs = _buildClientScript(mainJs, modules, importableResources)));

const _buildClientScript = (mainJs, resources, importableResources) => mainJs
    .replace('"%xmodulescripts%"', resources.map(md => _getScriptModule(md)).join(''))
    .replace('"%importableResources%"', JSON.stringify(importableResources))
    .replace('"%devmode%"', context.devMode)
    .replace('"%popupmodaltemplates%"', _preparePopupModalTemplates())
    .replace('"%components%"', components.getScripts());

const _getScriptModule = (res) => util.outdent`
    var ${res.name} = addModule(function(instance){
        var thisM = instance;
        var m = thisM;
        var thisModule = this; 
        function _expose(fn, name){
            _exposeFunction(thisModule, fn, false, name);
        }
        function _external(fn, name){
            _exposeFunction(thisModule, fn, true, name);
        }
        ${res.data}
    });`;

const _defaultModalTemplate = util.outdent`
    <div style="background:rgba(0,83,250,0.5);width: 100%;margin: 0;position: fixed;height: 100%;left: 0;top: 0;border: 0;-webkit-border-radius: 0;	-moz-border-radius: 0;-o-border-radius: 0;	border-radius: 0;	z-index: 3333;">
        <div style="borer:solid; position: relative;width: {obj.size.width}px; height: {obj.size.height}px; left: {obj.left}px; top: {obj.top}px; border:1px">
            <h1>{obj.title}</h1>
            <div>{obj.msg}<br><br><br>
                <div style="float: right;" button_place="true"></div>
            </div>
        </div>
    </div>`;

const _preparePopupModalTemplates = () => resources.getResources('./templates', r => r.endsWith('.modal.htmx'))
    .then(templates => (_.isEmpty(templates) ? [{path: XDEFAULT_TEMPLATE_PROPERTY, data: _defaultModalTemplate}] : templates)
        .map(tpl => `'${tpl.path}':'${tpl.data}'`).join(','));
    

module.exports = {
    reload: reload,
    getMinimoJs: () => minimoJs
};