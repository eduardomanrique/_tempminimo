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

const compileResources = (destDir, defaultTemplateName) =>
    components.startComponents().then(() =>
        resources.copy(_baseResPath, destDir)
        .then(resources.copy(baseResPath, `${destDir}/res`))
        .then(_restart)
        .then(_reloadFiles)
        .then(_reloadGlobalImported)
        .then(_generateAppCacheFile)
        .then(_startWatchService)
        .then(_collectAllResources)
        .then(_reloadCommonResources)
    ).catch((e) => console.log(`Error: ${e.message}`));

class ImportableResourceInfo {
    constructor(path, template) {
        this._path = path;
        this._templateName = template;
    }
    get path() {
        return this._path;
    }
    get templateName() {
        return this._templateName;
    }
}
class Resource {
    constructor(_path, _js, _htmx, _realPath, _global) {
        this._resourceName = _path.replace('/', '.');
        this._jsPath = util.nullableOption(_js ? `${_path}.js`: null);
        this._htmxPath = util.nullableOption(_htmx ? `${_path}.htmx`: null);
        this._relativeJsPath = util.nullableOption(_js ? `./pages${_path}.js`: null);
        this._relativeHtmxPath = util.nullableOption(_htmx ? `./pages${_path}.htmx`: null);
        this._realJsPath = util.nullableOption(_js ? `${_realPath}.js`: null);
        this._realHtmxPath = util.nullableOption(_htmx ? `${_realPath}.htmx`: null);
        this._global = _global;
        this._template = util.emptyOption();
    }
    get resourceName() {
        return this._resourceName;
    }
    get jsPath(){
        return this._jsPath;
    }
    get htmxPath(){
        return this._htmxPath;
    }
    get relativeJsPath(){
        return this._relativeJsPath;
    }
    get relativeHtmxPath(){
        return this._relativeHtmxPath;
    }
    get jsRealPath(){
        return this._realJsPath;
    }
    get htmxRealPath(){
        return this._realHtmxPath;
    }
    get templateName(){
        return this._template;
    }
    set templateName(_template){
        this._template = util.nullableOption(_template);
    }
    get isGlobal(){
        return this._global;
    }
}

const _getResourceInfo = (path, isGlobal) => new Promise((resolve) => {
    const noExtPath = path.substring(0, path.lastIndexOf('.'));
    if (!_cached.resourceInfoMap[noExtPath]) {
        return Promise.all([resources.exists(`./pages${noExtPath}.htmx`), resources.exists(`./pages${noExtPath}.js`)])
            .then(([existsHtmx, existsJs]) => {
                if (!existsHtmx && !existsJs) {
                    _cached.resourceInfoMap[noExtPath] = util.emptyOption();
                } else {
                    const realPath = resources.getRealPath(`/pages${existsHtmx ? `${noExtPath}.htmx` : `${noExtPath}.js`}`);
                    const resource = new Resource(noExtPath, existsJs, existsHtmx, realPath.substring(0, realPath.lastIndexOf('.')), isGlobal);
                    _cached.resourceInfoMap[noExtPath] = util.optionOf(resource);
                    resource.jsPath.ifPresent(p => _cached.appcacheResources.add(p));
                    resource.htmxPath.ifPresent(p => _cached.appcacheResources.add(p));
                }
                resolve(_cached.resourceInfoMap[noExtPath]);
            });
    }else{
        resolve(_cached.resourceInfoMap[noExtPath]);
    }
});
const _loadFileAndCache = (resInfo, compiledPage) =>
    resources.writeFile(`${baseDestPath}${resInfo.path}.js`, compiledPage);

const _reloadFiles = () =>
    resources.getResources("./pages", r => r.endsWith(".htmx") || r.endsWith(".js"))
        .then(values => _.groupBy(values, resource => resource.path.substring(0, resource.path.lastIndexOf('.'))))
        .then(values => _.mapObject(values, _reloadFile));

const _reloadFile = (_resources, path) => {
    const resInfo = _getResourceInfo(path);
    const htmx = path.htmxPath.isPresent() ? (_resources[0].path.endsWith('.htmx') ? _resources[0].data : _resources[1].data) : '';
    const js = path.jsPath.isPresent() ? (_resources[0].path.endsWith('.js') ? _resources[0].data : _resources[1].data) : '';
    let compiledPage = _compilePage(resInfo, htmx, js);
    _loadFileAndCache(resInfo, compiledPage);
    _cached.importableResourceInfo[path] = new ImportableResourceInfo(path, htmxResInfo.templateName);
}

const _blankHtml = () => `<html><body></body></html>`;

const _getTemplateData = (templateName) => {
    const resourceName = `./templates/${templateName}`;
    return resources.exists(resourceName).then(exists => exists ? resources.readResource(resourceName).then(r => r.data) : _blankHtml());
}

const _prepareScripts = (doc, htmlEl) => {
    let head = _.first(htmlEl.getElementsByName("head"));
    if (!head) {
        head = doc.createElement("head");
        htmlEl.insertChild(head, 0);
    }
    // params
    let script = head.addElement("script");
    script.setAttribute("type", "text/javascript");
    script.setAttribute("src", `${context.contextPath}/x/scripts/x.js`);

    doc.requiredResourcesList.forEach(e => {
        let source = e.getAttribute("src").trim();
        source = source.startsWith("/") ? source : `/${source}`;
        if (source.toLowerCase().endsWith(".js")) {
            script = head.addElement("script");
            script.setAttribute("type", "text/javascript");
            script.setAttribute("src", `${context.contextPath}/res${source}`);
        } else if (source.toLowerCase().endsWith("css")) {
            const linkEl = head.addElement("link");
            linkEl.setAttribute("href", `${context.contextPath}/res${source}`);
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

    const tempLoadDiv = doc.createElement("div");
    tempLoadDiv.setAttribute("id", "_xtemploaddiv_");
    tempLoadDiv.setAttribute("style",
        "position:absolute;top:0px;left:0px;height: 100%;width:100%;z-index: 99999;background-color: white;");
    const imgLoad = tempLoadDiv.addElement("img");
    imgLoad.setAttribute("style",
        "position:absolute;top:0;left:0;right:0;bottom:0;margin:auto;");
    imgLoad.setAttribute("height", "42");
    imgLoad.setAttribute("width", "42");
    imgLoad.setAttribute("src", `${context.contextPath}/x/loader.gif`);
    body.insertChild(tempLoadDiv, 0);
}

const _printScripts = (element) => element.children.forEach(e => {
    if (e.name == 'script') {
        const tag = `<script>${e.childre.map(c => c.text).join('')}</script>`;
        e.remove();
        return tag;
    }
    return '';
});

const _printHtmlWithoutBody = (doc) => `
    <html ${!context.devMode ? `manifest="${context.contextPath}/x/_appcache"` : ''}>
        <head>${_printScripts(_.first(doc.htmlElement.getElementsByName('head')))}</head>
    </html>`;

const _reloadTemplate = (templateName) => _getTemplateData(templateName)
    .then(data => {
        const templateDoc = new htmlParser.HTMLParser().parse(data);
        const boundVars = templateDoc.boundVars;
        const boundModals = templateDoc.boundModals;
        _prepareHTML(templateDoc, boundVars, boundModals);
        const xbody = _.first(templateDoc.getElementsByName("xbody"));
        _prepareTopElements(templateDoc);
        if (_.isEmpty(doc.findChildrenByName('xbody'))) {
            throw new Error('Template should have {xbody}');
        }
        const html = _printHtmlWithoutBody(templateDoc);
        const postString = `
            (function(){
        		var X = new _XClass();
                X.createHtml(${templateDoc.toJson()})
                    .then(function(){
                        X$._xbodyNode = document.getElementsByTagName('xbody')[0];
                        X$._xbodyNode.xsetModal = function(child){
                            X$._xbodyNode.pushChild(child);
                        };
                        var controller = new function(){
                            var __xbinds__ = null; 
                            this.__eval__ = function(f){
                                return eval(f);
                            };
                        };
                        X._setEvalFn(controller.__eval__);
                        document.body.setAttribute('data-x_ctx', 'true');
                        X.setController(controller, function(){
                            console.log('X started (spa)');
                        });
                        X.setSpaModalNode(X$._xbodyNode);
                    })
                    .then(X.getHtmlForUrl())
                    .then(X.createHtml);
                });
            })();`;
        const script = _.first(htmlEl.findChildrenByName("body")).addElement("script");
        script.setAttribute("type", "text/javascript");
        script.addText(postString);
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

const _compilePage = (resInfo, htmxData, jsData) => {
    const doc = new htmlParser.HTMLParser().parse(htmxData);
    resInfo.templateName = null;
    if (!doc.htmlElement) {
        //has template
        let templateInfo = doc.getElementsByName("template-info");
        if (templateInfo.length > 0) {
            templateInfo.forEach(ti => {
                resInfo.templateName = ti.getAttribute("path");
                ti.remove();
            });
        }
    }
    //get all the bound variables in the page
    const boundVars = doc.boundVars;
    //get all the bound modals in the page
    const boundModals = doc.boundModals;

    resInfo.templateName.ifPresent(_reloadTemplate);

    //place real html of components, prepare iterators and labels
    _prepareHTML(doc, boundVars, boundModals);
    return _instrumentController(doc.toJson(), jsData, false, resInfo, boundVars, boundModals)
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
    for(let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let isAnnot = false;
        const annotation = _checkAnnotation(lines, i);
        if (annotation) {
            if (annotation == Annotation.service) {
                //prepares service injection from js annotations (//service:pathtoservice)
                const nextLine = lines[++i];
                const [varName, params, next] = _parseVar("//service:", line, nextLine);
                binds.push(`${varName} = X.bindService('${params}');`);
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
                binds.push(`X.import('${params}.js').then(function(o){o.CTX=X.CTX;${varName} = o;})`);
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
                binds.push(`X.modalS('${paramArray[0].trim()}',${toggle},'${paramArray[1].trim()}').then(function(o){${varName} = o;})`);
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
        binds.push(`X.modalS('${val.path}', ${toggle},'${val.elementId}').then(function(o){${val.varName} = o;})`);
        if(!new RegExp(`\\s*var\\s+${val.varName}\\s*;`).exec(js)){
            result.unshift(`var ${val.varName};\n`);
        }
        hasBoundVar = true;
    });
    return `var __binds__ = ${hasBoundVar ? `[${binds.join(',')}]` : 'null'};
    //user code start

    ${result.join('')}

    //user code end
    `;
}

const _instrumentController = (htmlJson, jsData, isGlobal, resInfo, boundVars = [], boundModals = []) => {
    const jsName = resInfo.resourceName.replace(/\./g, '').replace(/\//g, '.');
    const preparedJs = _prepareInjections(jsData, boundModals);
    const boundVarDeclaration = [];
    boundVars.forEach(boundVar => {
        if (!boundVar.trim() == "" && !boundVar.trim().startsWith("${") && !boundVar.trim() == "this") {
            boundVarDeclaration.push(`var ${boundVar};\n`);
        }
    });
    const controllerObject = `function(xInstance){
        var X=xInstance;
        var setInterval=X._interval;
        var setTimeout=X._timeout;
        var clearInterval=X._clearInterval;
        var clearTimeout=X._clearTimeout;
        
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
                X.closeMsg(_xthis._id_modal);
            };
            this.closeModal = closeModal;
        `: ''}
        ${isGlobal ? `window.${_parseGlovalVarName(jsName)} = this;
        `: ''}
        this.__eval__ = function(f){
            return eval(f)
        };
    }`;

    if (isGlobal) {
        return `
        (function (){
            var _load = function(){
                var xInstance = new _XClass();
                X$._onScript(${JSON.stringify(htmlStruct)}, ${controllerObject}, xInstance, function(){
                    console.log("Global resource ${jsName} imported.")
                }, null, '${jsName}');
            };
            if(window.addEventListener) {
                window.addEventListener('load', _load, false);
            } else if(window.attachEvent) {
                window.attachEvent('onload', _load);
            }
        })();`;
    } else {
        return `X$.register(${JSON.stringify(htmlJson)}, '${jsName}', ${controllerObject});`;
    }
}

module.exports = {
    _restart: _restart,
    _getResourceInfo: _getResourceInfo,
    Resource: Resource,
    _compilePage: _compilePage,
    _prepareInjections: _prepareInjections,
    _instrumentController: _instrumentController,
    _reloadTemplate: _reloadTemplate,
    _getTemplateData: _getTemplateData,
    _prepareTopElements: _prepareTopElements
}