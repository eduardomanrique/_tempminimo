const resources = require('./resources');
const htmlParser = require('./htmlParser');
const components = require('./components');
const util = require('./util');
const _ = require('underscore');
const esprima = require('esprima');
const esprimaUtil = require('./esprimaUtil');

const context = require('./context');
const fs = require('fs');
const _basePagesPath = './pages';
const _baseResPath = './res';
const _htmxStrLength = ".htmx".length;
let _cached;
let parameters = {
    defaultTemplate: null
}

const _restart = () => new Promise((resolve) => {
    _cached = {
        modalPathsDeclared: {},
        appcacheResources: new Set(),
        importableScripts: {},
        templateMap: {},
        allResources: {},
        importableResourceInfo: {},
        resourceInfoMap: {},
        listByComponent: {}
    };
    resolve();
});
/*
xresourcemanager

public synchronized void reload() throws IOException {
    generateAppCacheFile();
    startWatchService();
    allResources = new HashSet<String>();
    collectAllResources();
    reloadCommonResources();
}
*/

const compileResources = () => resources.copy(_baseResPath, context.destinationPath)
    .then(resources.copy(_baseResPath, `${context.destinationPath}/res`))
    .then(_restart)
    .then(_reloadFiles)
    .then(_generateAppCacheFile)
    //.then(_startWatchService)
    .then(() => _cached.importableResourceInfo)
    .catch((e) => console.log(`Error: ${e.message}: ${e.stack}`));

class ImportableResourceInfo {
    constructor(path, template) {
        this.path = path;
        this.templateName = template;
    }
}
class Resource {
    constructor(_path, _js, _htmx, _realPath, _global) {
        this._path = _path;
        this._resourceName = _path.replace('/', '.');
        this._jsPath = util.nullableOption(_js ? `${_path}.js` : null);
        this._htmxPath = util.nullableOption(_htmx ? `${_path}.htmx` : null);
        this._relativeJsPath = util.nullableOption(_js ? `./pages${_path}.js` : null);
        this._relativeHtmxPath = util.nullableOption(_htmx ? `./pages${_path}.htmx` : null);
        this._realJsPath = util.nullableOption(_js ? `${_realPath}.js` : null);
        this._realHtmxPath = util.nullableOption(_htmx ? `${_realPath}.htmx` : null);
        this._global = _global;
        this._template = util.emptyOption();
    }
    get resourceName() {
        return this._resourceName;
    }
    get jsPath() {
        return this._jsPath;
    }
    get htmxPath() {
        return this._htmxPath;
    }
    get relativeJsPath() {
        return this._relativeJsPath;
    }
    get relativeHtmxPath() {
        return this._relativeHtmxPath;
    }
    get jsRealPath() {
        return this._realJsPath;
    }
    get htmxRealPath() {
        return this._realHtmxPath;
    }
    get templateName() {
        return this._template;
    }
    set templateName(_template) {
        this._template = util.nullableOption(_template);
    }
    get isGlobal() {
        return this._global;
    }
    get path() {
        return this._path;
    }
}

const _generateAppCacheFile = () => resources.writeFile(`${context.destinationPath}/m/_appcache`, util.outdent`
    CACHE MANIFEST
    # ${new Date().getTime()}
    # This file is automatically generated
    CACHE:
    /m/scripts/m.js
    ${Array.from(_cached.appcacheResources).map(r => `${r}`).join('\n')}
    NETWORK:
    *
    FALLBACK:
    `);

const _getResourceInfo = (path, isGlobal) => new Promise((resolve) => {
    const noExtPath = path.indexOf('.') > 0 ? path.substring(0, path.lastIndexOf('.')) : path;
    if (!_cached.resourceInfoMap[noExtPath]) {
        return [resources.exists(`./pages${noExtPath}.htmx`), resources.exists(`./pages${noExtPath}.js`)].toPromise()
            .then(([existsHtmx, existsJs]) => {
                if (!existsHtmx && !existsJs) {
                    _cached.resourceInfoMap[noExtPath] = util.emptyOption();
                } else {
                    const realPath = resources.getRealPath(`/pages${existsHtmx ? `${noExtPath}.htmx` : `${noExtPath}.js`}`);
                    const resource = new Resource(noExtPath, existsJs, existsHtmx, realPath.substring(0, realPath.lastIndexOf('.')), isGlobal);
                    _cached.resourceInfoMap[noExtPath] = util.optionOf(resource);
                    resource.jsPath.ifPresent(p => _cached.appcacheResources.add(p));
                    resource.htmxPath.ifPresent(p => _cached.appcacheResources.add(p.replace(/\.htmx$/, '.html')));
                }
                resolve(_cached.resourceInfoMap[noExtPath]);
            });
    } else {
        resolve(_cached.resourceInfoMap[noExtPath]);
    }
});
const _loadFileAndCache = (resInfo, compiled) => Promise.all([
    resources.writeFile(`${context.destinationPath}${resInfo.path}.html`, compiled.html),
    resources.writeFile(`${context.destinationPath}${resInfo.path}.m.js`, compiled.js)
        .then(() => {
            if(compiled.globalJs){
                return resources.writeFile(`${context.destinationPath}${resInfo.path}.js`, compiled.js)
            }
        })]);

const _reloadFiles = () =>
    resources.getResources("./pages", r => r.endsWith(".htmx") || r.endsWith(".js"))
        .then(values => _.groupBy(values, resource => resource.path.substring(0, resource.path.lastIndexOf('.'))))
        .then(values => _.keys(values).map(key => {
            return _reloadFile(values[key], key)
        }).toPromise());

const _reloadFile = (_resources, path) => _getResourceInfo(path.replace(/\.\/pages/, ''))
    .then(resInfoOption => resInfoOption.map(resInfo => {
        const htmx = util.nullableOption(resInfo.htmxPath.isPresent() ? (_resources[0].path.endsWith('.htmx') ? _resources[0].data : _resources[1].data) : null);
        const js = util.nullableOption(resInfo.jsPath.isPresent() ? (_resources[0].path.endsWith('.js') ? _resources[0].data : _resources[1].data) : null);
        return _compilePage(resInfo, htmx, js)
            .then(compiled => _loadFileAndCache(resInfo, compiled))
            .then(() => {
                _cached.importableResourceInfo[resInfo.path] = new ImportableResourceInfo(resInfo.path, resInfo.templateName);
                _cached.appcacheResources.add(`${resInfo.path}.m.js`);
                htmx.ifNotPresent(() => {
                    _cached.appcacheResources.add(`${resInfo.path}.js`);
                });
            });
    }));


const _blankHtml = () => `<html><body>{mcontent}</body></html>`;

const _getTemplateData = (templateName) => new Promise((r) => {
    if(!templateName){
        r(false);
    }else{
        const resourceName = `./templates/${templateName}`;
        resources.exists(resourceName).then(() => r(resourceName));
    }
}).then(name => name ? resources.readResource(name).then(r => r.data) : _blankHtml());

const _prepareScripts = (doc, htmlEl) => {
    const head = util.firstOption(htmlEl.getElementsByName("head"))
        .orElseGet(() => {
            const head = doc.createElement("head");
            htmlEl.insertChild(head, 0);
            return head;
        });
    // params
    let script = head.addElement("script");
    script.setAttribute("type", "text/javascript");
    script.setAttribute("src", `/m/scripts/m.js`);

    doc.requiredResourcesList.forEach(e => {
        let source = e.getAttribute("src").trim();
        source = source.startsWith("/") ? source : `/${source}`;
        if (source.toLowerCase().endsWith(".js")) {
            script = head.addElement("script");
            script.setAttribute("type", "text/javascript");
            script.setAttribute("src", `/res${source}`);
        } else if (source.toLowerCase().endsWith("css")) {
            const linkEl = head.addElement("link");
            linkEl.setAttribute("href", `/res${source}`);
            if (e.getAttribute("rel")) {
                linkEl.setAttribute("rel", e.getAttribute("rel"));
            }
            linkEl.setAttribute("rel", "stylesheet");
            if (e.getAttribute("media")) {
                linkEl.setAttribute("media", e.getAttribute("media"));
            }
        }
    });
}

const _prepareTopElements = (doc) => {
    const htmlList = doc.getElementsByName("html");
    if (_.isEmpty(htmlList) || htmlList.length > 1) {
        throw new Error("Invalid page. There must be one (and only one) html element in a html page");
    }
    const htmlEl = htmlList[0];
    _prepareScripts(doc, htmlEl);

    const bodyList = htmlEl.getElementsByName("body");
    if (_.isEmpty(bodyList) || bodyList.length > 1) {
        throw new Error("Invalid page. There must be one (and only one) body element in a html page");
    }
    const body = bodyList[0];
    body.addText("\n\n");

}

const _printElements = (element) => element.children.map(e => {
    if (e instanceof htmlParser.Element) {
        const tag = `<${e.name} ${e.attributes.map(a => `${a.name}="${a.value.replace(/"/g, '\\"')}"`).join(' ')}>${e.children.map(c => c.text).join('')}</${e.name}>`;
        e.remove();
        return tag;
    }
    return '';
}).join('\n');

const _printCleanHtml = (doc) => `
    <html ${!context.devMode ? `manifest="/m/_appcache"` : ''}>
        <head>${util.firstOption(doc.htmlElement.getElementsByName('head')).map(_printElements, '')}</head>
        <body>${util.firstOption(doc.htmlElement.getElementsByName('body')).map(_printElements, '')}</body>
    </html>`;

const _reloadTemplate = (resInfo) => _getTemplateData(resInfo.templateName.value)
    .then(data => {
        const templateDoc = new htmlParser.HTMLParser().parse(data.replace(/\{mcontent\}/, '<mcontent></mcontent>'));
        const boundVars = templateDoc.boundVars;
        const boundModals = templateDoc.boundModals;
        _prepareHTML(templateDoc, boundVars, boundModals);
        if (_.isEmpty(templateDoc.getElementsByName("mcontent"))) {
            throw new Error('Template should have {mcontent}');
        }
        _prepareTopElements(templateDoc);
        const body = _.first(templateDoc.getElementsByName("body"));
        const postString = `
            startMainInstance({c: ${JSON.stringify(body.toJson().c)}});
        `;
        body.removeAllChildren();
        const script = body.addElement("script");
        script.setAttribute("type", "text/javascript");
        script.addText(postString);
        const resultHtml = _printCleanHtml(templateDoc);
        return resultHtml;
    });


//add child element of this doc that can be cached with appcache
const _addChildValidElements = (doc) => {
    doc.getElementsByName("script").forEach(script => {
        const src = script.getAttribute("src");
        if (src && !src.startsWith("http://")) {
            _cached.appcacheResources.add(src);
        }
    });
    doc.getElementsByName("link").forEach(link => {
        const href = link.getAttribute("href");
        if (href) {
            _cached.appcacheResources.add(href);
        }
    });
}

const _getTemplateKey = (resourceInfo) => resourceInfo.templateName.orElse(`no_template:${resourceInfo.resourceName}`)

const _loadTemplate = (resourceInfo) => {
    const templateName = _getTemplateKey(resourceInfo);
    if (!_cached.templateMap[templateName]) {
        return _reloadTemplate(resourceInfo);
    }else{
        return util.toPromise();
    }
};

const _compilePage = (resInfo, htmxData, jsData) => {
    const parser = new htmlParser.HTMLParser();
    const doc = util.nullableOption(htmxData.map(html => parser.parse(html)));
    resInfo.templateName = null;
    //place real html of components, prepare iterators and labels
    doc.ifPresent(d => _prepareHTML(d, parser.boundObjects, parser.boundModals));
    const boundVars = _.uniq(parser.boundObjects);
    const boundModals = _.uniq(parser.boundModals);
    const compiled = {js: _instrumentController(doc.map(d => d.toJson()), jsData, false, resInfo, boundVars, boundModals)};
    htmxData.ifNotPresent(() => compiled.globalJs = _instrumentController(util.emptyOption(), jsData, true, resInfo, boundVars, boundModals));
    if (doc.isPresent() && !doc.value.htmlElement) {
        //has template
        let templateInfo = util.firstOption(doc.value.getElementsByName("template-info"));
        if(templateInfo.isPresent()){
            templateInfo.value.remove();
            resInfo.templateName = templateInfo.value.getAttribute("path");
        }else{
            resInfo.templateName = parameters.defaultTemplate;
        }
    }
    return _loadTemplate(resInfo).then((html) => {
        compiled.html = html;
        return compiled;
    });
}

const _prepareHTML = (doc, boundVars, boundModals) => {
    components.buildComponentsOnPage(doc, boundVars, boundModals);
    const recValues = doc.addElement("xrs");
    recValues.addChildList(doc.requiredResourcesList);
    doc.requiredResourcesList.forEach(requiredElement => {
        const src = requiredElement.getAttribute("src");
        if (src.startsWith("/")) {
            src = src.substring(1);
        }
        _cached.appcacheResources.add("/res/" + src);
    });
    _.values(boundModals).forEach(modal => _cached.appcacheResources.add(modal.path));
    _addChildValidElements(doc);
}

const _checkAnnotationToVar = (name, lines, currentIndex) => {
    if (lines[currentIndex].trim().startsWith(`//${name}:`)) {
        return currentIndex < lines.length && lines[currentIndex + 1].trim().startsWith("var ");
    }
    return false;
}

const Annotation = {
    service: "service",
    importJs: "importJs",
    modal: "modal"
}

const _checkAnnotation = (lines, i) => {
    if (_checkAnnotationToVar("service", lines, i)) {
        return Annotation.service;
    } else if (_checkAnnotationToVar("import", lines, i)) {
        return Annotation.importJs;
    } else if (_checkAnnotationToVar("modal", lines, i)) {
        return Annotation.modal;
    }
    return null;
}

const _parseVar = (fn, line, nextLine) => {
    line = line.trim();
    nextLine = nextLine.trim();
    const index = nextLine.indexOf(";");
    let newNextLine = null;
    if (index > 0) {
        newNextLine = nextLine.substring(index + 1);
        nextLine = nextLine.substring(0, index);
    }
    const varName = nextLine.split(" ")[1];
    return [varName, line.substring(fn.length).trim(), newNextLine];
}

const _prepareInjections = (js, boundModals) => {
    const result = [];
    const binds = [];
    const lines = js.split("\n");
    let hasBoundVar = false;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let isAnnot = false;
        const annotation = _checkAnnotation(lines, i);
        if (annotation) {
            if (annotation == Annotation.service) {
                //prepares service injection from js annotations (//service:pathtoservice)
                const nextLine = lines[++i];
                const [varName, params, next] = _parseVar("//service:", line, nextLine);
                binds.push(`${varName} = m.bindService('${params}');`);
                result.push(`var ${varName};\n`);
                hasBoundVar = true;
                if (next) {
                    result.push(`${next}\n`);
                }
                isAnnot = true;
            } else if (annotation == Annotation.importJs) {
                //prepares import injection from js annotations (//import:pathtojs)
                const nextLine = lines[++i];
                const [varName, params, next] = _parseVar("//import:", line, nextLine);
                binds.push(`m.import('${params}.js').then(function(o){o.CTX=m.CTX;${varName} = o;})`);
                result.push(`var ${varName};\n`);
                hasBoundVar = true;
                if (next) {
                    result.push(`${next}\n`);
                }
                isAnnot = true;
            } else if (annotation == Annotation.modal) {
                //prepares modal injection from js annotation (//modal:path,parameters)
                const nextLine = lines[++i];
                const [varName, params, next] = _parseVar("//modal:", line, nextLine);
                const paramArray = params.split(",");
                const toggle = paramArray.length > 2 && paramArray[2].toLowerCase() == "toggle";
                binds.push(`m.modalS('${paramArray[0].trim()}',${toggle},'${paramArray[1].trim()}').then(function(o){${varName} = o;})`);
                result.push(`var ${varName};\n`);
                hasBoundVar = true;
                if (next) {
                    result.push(next + "\n");
                }
                isAnnot = true;
            }
        }
        if (!isAnnot) {
            result.push(`${line}\n`);
        }

    }
    boundModals.forEach(val => {
        const toggle = val.toggled;
        binds.push(`m.modalS('${val.path}', ${toggle},'${val.elementId}').then(function(o){${val.varName} = o;})`);
        if (!new RegExp(`\\s*var\\s+${val.varName}\\s*;`).exec(js)) {
            result.unshift(`var ${val.varName};\n`);
        }
        hasBoundVar = true;
    });
    return `var __binds__ = [${binds.join(',')}];
    //user code start

    ${result.join('')}

    //user code end
    `;
}

const _parseGlovalVarName = (name) => {
    let result = name.substring(name.lastIndexOf('/') + 1);
    let index;
    while ((index = result.indexOf('-')) >= 0) {
        result = result.substring(0, index) + result.substring(index + 1, index + 2).toUpperCase() + result.substring(index + 2);
    }
    return result.startsWith("_") ? result.substring(1) : result;
}

const _instrumentController = (htmlJson, jsData, isGlobal, resInfo, boundVars = [], boundModals = []) => {
    const jsName = resInfo.resourceName.replace(/\./g, '').replace(/\//g, '.');
    const preparedJs = jsData.map(js => _prepareInjections(js, boundModals), "");
    const boundVarDeclaration = [];
    boundVars.forEach(boundVar => {
        if (!boundVar.trim() == "" && !boundVar.trim().startsWith("${") && !boundVar.trim() != "this") {
            boundVarDeclaration.push(`var ${boundVar};\n`);
        }
    });
    const controllerObject = `function(instance){
        var m=instance;
        var setInterval=m.setInterval;
        var setTimeout=m.setTimeout;
        var clearInterval=m.clearInterval;
        var clearTimeout=m.clearTimeout;
        
        ${!_.isEmpty(boundVarDeclaration) ? `//undeclared vars
        ${boundVarDeclaration.join('')}

        `:''}
        ${preparedJs}
        ${esprimaUtil.getFirstLevelFunctions(esprima.parse(preparedJs)).map(fn => `this.${fn} = ${fn}`).join(';')};
        this.resourceName = '${jsName}';
        ${resInfo.htmxPath.isPresent() && resInfo.relativeHtmxPath.value.endsWith(".modal.htmx") ?
            `this.isModal = true;
            _xthis=this;
            function closeModal(){
                m.closeMsg(_xthis._id_modal);
            };
            this.closeModal = closeModal;
        `: ''}
        ${isGlobal ? `window.${_parseGlovalVarName(resInfo.resourceName)} = this;
        `: ''}
        this.__eval__ = function(f){
            return eval(f)
        };
    }`;

    if (isGlobal) {
        return `
        (function (){
            const _load = () => startScript(${controllerObject});
            if(window.addEventListener) {
                window.addEventListener('load', _load, false);
            } else if(window.attachEvent) {
                window.attachEvent('onload', _load);
            }
        })();`;
    } else {
        return `function _m_temp_startInstance(insertPoint, modal){
            return startInstance(insertPoint,${JSON.stringify(htmlJson)}, ${controllerObject}, modal);
        };_m_temp_startInstance;`;
    }
}

const compiler = {
    _restart: _restart,
    _getResourceInfo: _getResourceInfo,
    Resource: Resource,
    _compilePage: _compilePage,
    _prepareInjections: _prepareInjections,
    _instrumentController: _instrumentController,
    _reloadTemplate: _reloadTemplate,
    _getTemplateData: _getTemplateData,
    _prepareTopElements: _prepareTopElements,
    _appcache: () => _cached.appcacheResources,
    _resetAppcache: () => _cached.appcacheResources = new Set(),
    _reloadFiles: _reloadFiles,
    compileResources: compileResources,
    setParameters: (p) => parameters = p
}
module.exports = compiler;