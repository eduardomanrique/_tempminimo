const resources = require('./resources');
const htmlParser = require('./htmlParser');
const components = require('./components');
const options = require('minimojs-options');
const _ = require('underscore');
const esprima = require('esprima');
const esprimaUtil = require('./esprimaUtil');
const TraceError = require('trace-error');

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

const compileResources = async () => {
    try {
        await resources.copy(_baseResPath, context.destinationPath)
        await resources.copy(_baseResPath, `${context.destinationPath}/res`);
        await _restart();
        await _reloadFiles();
        //_startWatchService
        return _cached.importableResourceInfo;
    } catch (e) {
        const error = `Error: ${e.message}: ${e.stack}`;
        console.log(error);
        throw new Error(error);
    }
}
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
        this._jsPath = options.nullableOption(_js ? `${_path}.js` : null);
        this._htmxPath = options.nullableOption(_htmx ? `${_path}.htmx` : null);
        this._relativeJsPath = options.nullableOption(_js ? `./pages${_path}.js` : null);
        this._relativeHtmxPath = options.nullableOption(_htmx ? `./pages${_path}.htmx` : null);
        this._realJsPath = options.nullableOption(_js ? `${_realPath}.js` : null);
        this._realHtmxPath = options.nullableOption(_htmx ? `${_realPath}.htmx` : null);
        this._global = _global;
        this._template = options.emptyOption();
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
        this._template = options.nullableOption(_template);
    }
    get isGlobal() {
        return this._global;
    }
    get path() {
        return this._path;
    }
}

const _getResourceInfo = async (path, isGlobal) => {
    const noExtPath = path.indexOf('.') > 0 ? path.substring(0, path.lastIndexOf('.')) : path;
    if (!_cached.resourceInfoMap[noExtPath]) {
        const [existsHtmx, existsJs] = await Promise.all([resources.exists(`./pages${noExtPath}.htmx`), resources.exists(`./pages${noExtPath}.js`)]);
        if (!existsHtmx && !existsJs) {
            _cached.resourceInfoMap[noExtPath] = options.emptyOption();
        } else {
            const realPath = resources.getRealPath(`/pages${existsHtmx ? `${noExtPath}.htmx` : `${noExtPath}.js`}`);
            const resource = new Resource(noExtPath, existsJs, existsHtmx, realPath.substring(0, realPath.lastIndexOf('.')), isGlobal);
            _cached.resourceInfoMap[noExtPath] = options.optionOf(resource);
            resource.jsPath.ifPresent(p => _cached.appcacheResources.add(p));
            resource.htmxPath.ifPresent(p => _cached.appcacheResources.add(p.replace(/\.htmx$/, '.html')));
        }
    }
    return _cached.resourceInfoMap[noExtPath];
}

const _loadFileAndCache = async (resInfo, compiled) => {
    await resources.writeFile(`${context.destinationPath}${resInfo.path}.html`, compiled.html);
    await resources.writeFile(`${context.destinationPath}${resInfo.path}.js`, compiled.js);
}

const _reloadFiles = async () => {
    let values = await resources.getResources("./pages", r => r.endsWith(".htmx") || r.endsWith(".js"));
    let groupped = await _.groupBy(values, resource => resource.path.substring(0, resource.path.lastIndexOf('.')));
    await Promise.all(_.keys(groupped).map(key => {
        return _reloadFile(groupped[key], key)
    }));
}

const _reloadFile = async (_resources, path) => {
    const resInfo = (await _getResourceInfo(path.replace(/\.\/pages/, ''))).value;
    const htmx = options.nullableOption(resInfo.htmxPath.isPresent() ? (_resources[0].path.endsWith('.htmx') ? _resources[0].data : _resources[1].data) : null);
    const js = options.nullableOption(resInfo.jsPath.isPresent() ? (_resources[0].path.endsWith('.js') ? _resources[0].data : _resources[1].data) : null);
    await _loadFileAndCache(resInfo, await _compilePage(resInfo, htmx, js));
    _cached.importableResourceInfo[resInfo.path] = new ImportableResourceInfo(resInfo.path, resInfo.templateName);
    _cached.appcacheResources.add(`${resInfo.path}.js`);
}


const _blankHtml = () => `<html><body>{mcontent}</body></html>`;

const _getTemplateData = async (templateName) => {
    if (templateName) {
        const resourceName = `./templates/${templateName}`;
        if (await resources.exists(resourceName)) {
            const resorce = await resources.readResource(resourceName);
            return resorce.data;
        }
    }
    return _blankHtml();
}

const _prepareScripts = (doc, htmlEl) => {
    const head = options.firstOption(htmlEl.getElementsByName("head"))
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
        <head>${options.firstOption(doc.htmlElement.getElementsByName('head')).map(_printElements, '')}</head>
        <body>${options.firstOption(doc.htmlElement.getElementsByName('body')).map(_printElements, '')}</body>
    </html>`;

const _reloadTemplate = async (resInfo) => {
    const data = await _getTemplateData(resInfo.templateName.value);
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
}

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
    } else {
        return null;
    }
};

const _compilePage = (resInfo, htmxData, jsData) => {
    const parser = new htmlParser.HTMLParser();
    let doc;
    try {
        doc = options.nullableOption(htmxData.map(html => parser.parse(html.replace(/\{modal-content\}/g, '<modalcontent></modalcontent>'))));
    } catch (e) {
        throw new TraceError(`Error parsing htmx file: ${resInfo._htmxPath.value}`, e);
    }
    resInfo.templateName = null;
    //place real html of components, prepare iterators and labels
    doc.ifPresent(d => _prepareHTML(d, parser.boundObjects, parser.boundModals));
    const boundVars = _.uniq(parser.boundObjects);
    const boundModals = _.uniq(parser.boundModals);
    const compiled = {
        js: _instrumentController(doc.map(d => d.toJson()), jsData, resInfo, boundVars, boundModals)
    };
    if (doc.isPresent() && !doc.value.htmlElement) {
        //has template
        let templateInfo = options.firstOption(doc.value.getElementsByName("template-info"));
        if (templateInfo.isPresent()) {
            templateInfo.value.remove();
            resInfo.templateName = templateInfo.value.getAttribute("path");
        } else {
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
    doc.requiredResourcesList.forEach(requiredElement => {
        let src = requiredElement.getAttribute("src");
        if (src.startsWith("/")) {
            src = src.substring(1);
        }
        const scriptElement = doc.addElement("script");
        src = `/res/${src}`;
        scriptElement.setAttribute('src', src);
        _cached.appcacheResources.add(src);
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
            if (annotation == Annotation.importJs) {
                //prepares import injection from js annotations (//import:pathtojs)
                const nextLine = lines[++i];
                const [varName, params, next] = _parseVar("//import:", line, nextLine);
                binds.push(`m.import('${params}').then(function(m){
                    ${varName} = m.controller;
                })`);
                result.push(`var ${varName};\n`);
                hasBoundVar = true;
                if (next) {
                    result.push(`${next}\n`);
                }
                isAnnot = true;
            }
        }
        if (!isAnnot) {
            result.push(`${line}\n`);
        }

    }
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

const _instrumentController = (htmlJson, jsData, resInfo, boundVars = [], boundModals = []) => {
    const jsName = resInfo.resourceName.replace(/\./g, '').replace(/\//g, '.');
    const preparedJs = jsData.map(js => _prepareInjections(js, boundModals), "var __binds__ = [];");
    const boundVarDeclaration = [];
    boundVars.forEach(boundVar => {
        if (!boundVar.trim() == "" && !boundVar.trim().startsWith("${") && !boundVar.trim() != "this") {
            boundVarDeclaration.push(`var ${boundVar};\n`);
        }
    });
    const scriptOnly = htmlJson == null;
    let parsedJs;
    try {
        parsedJs = esprima.parse(preparedJs);
    } catch (e) {
        throw new Error(`Invalid js controller '${jsName}': ${e.message}`);
    }
    const controllerObject = `function(instance){
        const m=instance;
        const setInterval=m.setInterval;
        const setTimeout=m.setTimeout;
        const clearInterval=m.clearInterval;
        const clearTimeout=m.clearTimeout;
        const $issue=m.issue;
        const $go=m.go;

        ${!_.isEmpty(boundVarDeclaration) ? `//undeclared vars
        ${boundVarDeclaration.join('')}

        `:''}
        ${preparedJs}
        ${esprimaUtil.getFirstLevelFunctions(parsedJs).map(fn => `this.${fn} = ${fn}`).join(';')};
        this.resourceName = '${jsName}';
        ${resInfo.htmxPath.isPresent() && resInfo.relativeHtmxPath.value.endsWith(".modal.htmx") ?
            `this.isModal = true;
            _xthis=this;
            function closeModal(){
                m.closeMsg(_xthis._id_modal);
            };
            this.closeModal = closeModal;
        `: ''}
        ${scriptOnly ? `if(m.isGlobalScriptImport){window.${_parseGlovalVarName(resInfo.resourceName)} = this};` : ''}
        this.__eval__ = function(f){
            return eval(f);
        };
    }`;

    if (scriptOnly) {
        return `
        (function (localJs){
            const _load = () => {
                return Minimo.builder().withController(${controllerObject}).withLocalJs(localJs).build().start();
            }
            if(localJs){
                return _load();
            }else{
                if(window.addEventListener) {
                    window.addEventListener('load', _load, false);
                } else if(window.attachEvent) {
                    window.attachEvent('onload', _load);
                }
            }
        })(false)`;
    } else {
        return `[${JSON.stringify(htmlJson)},${controllerObject}]`;
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