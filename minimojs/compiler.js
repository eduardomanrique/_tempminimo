const resources = require('./resources');
const htmlParser = require('./htmlParser');
const components = require('./components');
const util = require('./util');

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
        .then(_reloadHtmxFiles)
        .then(_reloadJsFiles)
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
    constructor() {
        //ref to html (loader html)
        this.path = null;
        //ref to js with struct and controller
        this.jsPath = null;
        //disk path to generated js file
        this.jsRealPath = null;
        //relative path to generated js file
        this.relativeJsPath = null;
        this.relativePath = null;
        this.templateName = null;
        this.global = null;
        this.jsOnly = false;
    }
}

const _getResourceInfo = (path, isGlobal) => {
    return new Promise((resolve) => {
        if (!_cached.resourceInfoMap[path]) {
            const relativePath = `./pages${path}`;
            fs.lstat(relativePath, (err, stats) => {
                if (!err || err.code == 'ENOENT') {
                    const noExtensionPath = path.substring(0, path.lastIndexOf('.'));
                    const _get = (stats) => {
                        const isDir = stats.isDirectory();
                        const relativeJsPath = `./pages${noExtensionPath}${isDir?'/index':''}.js`;
                        resources.exists(relativeJsPath).then(exists => {
                            if (!exists) {
                                _cached.resourceInfoMap[path] = util.emptyOption();
                            } else {
                                const resource = new Resource();
                                resource.jsOnly = path.endsWith(".js");
                                resource.path = path;
                                resource.jsPath = `${noExtensionPath}${isDir?'/index':''}.js`;
                                resource.global = isGlobal;
                                resource.relativeJsPath = relativeJsPath;
                                resource.relativePath = relativePath;
                                resource.jsRealPath = resources.getRealPath(resource.relativeJsPath);

                                _cached.resourceInfoMap[path] = util.optionOf(resource);
                                _cached.appcacheResources.add(path);
                                _cached.appcacheResources.add(resource.jsPath);
                            }
                            resolve(_cached.resourceInfoMap[path]);
                        });
                    }
                    if (err && err.code == 'ENOENT') {
                        resources.exists(`./pages${noExtensionPath}`).then(stats => {
                            if (stats) {
                                _get(stats);
                            } else {
                                _cached.resourceInfoMap[path] = util.emptyOption();
                                resolve(_cached.resourceInfoMap[path]);
                            }
                        });
                    } else {
                        _get(stats);
                    }
                } else {
                    reject(err);
                }
            });
        } else {
            resolve(_cached.resourceInfoMap[path]);
        }
    });
}
const _loadFileAndCache = (resInfo, compiledPage) =>
    resources.writeFile(`${baseDestPath}${resInfo.path}.js`, compiledPage);

const _reloadHtmxFiles = () =>
    resources.getResources("./pages", r => r.endsWith(".htmx"))
    .then(values => values.forEach(_reloadHtmxFile));

const _reloadHtmxFile = htmxFile => {
    let path = htmxFile.path.substring(_basePagesPath.length, htmxFile.path.length - _htmxStrLength);
    const resInfo = _getResourceInfo(path);
    //load html main window
    // resInfo
    resources.readResource(resInfo.jsRealPath).then(jsFile => {
        let compiledPage = _compilePage(resInfo, htmxFile.data, jsFile.data);
        _loadFileAndCache(resInfo, compiledPage);
        _cached.importableResourceInfo[path] = new ImportableResourceInfo(path, htmxResInfo.templateName);
    });
}

const _blankHtml = () => `<html><body></body></html>`;

const _getTemplateData = (templateName) =>
    resources.getResources(`./templates${templateName}`)
    .then(values => _.isEmpty(values) ? _blankHtml() : _.first(values).data);

const _prepareScripts = (doc, htmlEl) => {
    let head = _.first(htmlEl.findChildrenByName("head"));
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
    const htmlList = doc.findChildrenByName("html");
    if (_.isEmpty(htmlList) || htmlList.length > 1) {
        throw new Error("Invalid page. There must be one (and only one) html element in a html page");
    }
    const htmlEl = htmlList[0];
    _prepareScripts(doc, htmlEl);

    const bodyList = htmlEl.findChildrenByName("body");
    if (_.isEmpty(bodyList) || bodyList.length > 1) {
        throw new Error("Invalid page. There must be one (and only one) body element in a html page");
    }
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
                            X$._xbodyNode.appendChild(child);
                        };
                        var controller = new function(){
                            var __xbinds__ = null; 
                            this._x_eval = function(f){
                                return eval(f);
                            };
                        };
                        X._setEvalFn(controller._x_eval);
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
    console.log(`Loading htmx ${resInfo.path}`);
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

    _reloadTemplate(resInfo.templateName);

    //place real html of components, prepare iterators and labels
    _prepareHTML(doc, boundVars, boundModals);
    return _instrumentController(doc.toJson(), jsData, boundVars, boundModals);
}

const _prepareHTML = (doc, boundVars, boundModals) => {
    const compInfo = {};
    _componentsInfo.forEach(comp => components.buildComponentOnPage(comp, doc, boundVars, boundModals, compInfo));
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

module.exports = {
    _restart: _restart,
    _getResourceInfo: _getResourceInfo
}