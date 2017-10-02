const resources = require('../minimojs/resources');
const htmlParser = require('../minimojs/htmlParser');
const context = require('../minimojs/context');
const fs = require('fs');
const _basePagesPath = './pages';
const _baseResPath = './res';
const _htmxStrLength = ".htmx".length();
let _cached;

const _restart = () => new Promise(() => 
    _cached = {
        modalPathsDeclared: {},
        validResources: {},
        importableScripts: {},
        templateMap: {},
        allResources: {},
        importableResourceInfo: {},
        resourceInfoMap = {}
    });

const compileResources = (destDir, defaultTemplateName) => 
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

class ImportableResourceInfo {
    constructor(path, template) {
        this._path = path;
        this._templateName = template;
    }
    get path(){
        return this._path;
    }
    get templateName(){
        return this._templateName;
    }
}
class Resource {
    constructor(){
        this.path = null;
        this.htmxRealPath = null;
        this.jsRealPath = null;
        this.relativeJsPath = null;
        this.relativeHtmxPath = null;
        this.templateName = null;
        this.global = null;
        this.jsOnly = false;
    }
}

const _getResourceInfo = (path, isGlobal) => {
    let resInfo = _cached.resourceInfoMap[path];
    if (!resInfo) {
        let result = new Resource();
        result.jsOnly = path.endsWith(".js");
        let noExtensionPath = path.substring(0, path.lastIndexOf('.'));
        result.global = isGlobal;    
        let isDir = fs.lstatSync(noExtensionPath).isDirectory();

        result.relativeJsPath = `./pages${noExtensionPath}${isDir?'/index':''}.js`;
        result.jsRealPath = resources.getRealPath(result.relativeJsPath);
        if(!result.jsOnly){
            result.relativeHtmxPath = `./pages${noExtensionPath}${isDir?'/index':''}.htmx`;
            result.htmxRealPath = resources.getRealPath(result.relativePath);
        }
        if(!resources.exists(result.relativeJsPath) && !resources.exists(result.htmxRealPath)){
            _cached.resourceInfoMap[path] = {empty: true};
            return null;
        }
        result.path = path;
        resourceInfoMap[path] = result;
    }
    return resInfo.empty ? null : resInfo;
}

const _addPath = (map, path, owner) => {
    const list = map[path];
    if (owner) {
        if (!list) {
            list = [];
        }
        list.push(owner);
    }
    map[path] = list;
}
const _loadFileAndCache = (resInfo, htmxData, jsData) => 
    resources.writeFile(`${baseDestPath}${resInfo.path}.js`, _compilePage(resInfo, htmxData, jsData));

const _reloadHtmxFiles = () => resources.getResources("./pages", r => r.endsWith(".htmx"))
    .then(values => values.forEach(htmxFile => {
        let path = htmxFile.path.substring(_basePagesPath.length, htmxFile.path.length - _htmxStrLength);
        const resInfo = _getResourceInfo(path);
        //load html main window
        _addPath(_cached.validResources, path, null);
        resources.readResource(resInfo.jsRealPath).then(jsFile => {
            _loadFileAndCache(resInfo, htmxFile.data, jsFile.data);
            _cached.importableResourceInfo[path] = new ImportableResourceInfo(path, htmxResInfo.templateName);
            _addPath(_cached.validResources, path + (info.templateName ? ".m" : ".p") + ".js", null);
        });
    }));

const _reloadTemplate = (templateName) => {
    // if null prepare the blank html template? ler annot
    // List<XElement> xbody = templateDoc.getElementsByName("xbody");
    // for (XNode node : doc.getChildren()) {
    //     xbody.get(0).addChild(node);
    // }
    // templateDoc.getRequiredResourcesList().addAll(doc.getRequiredResourcesList());
    // doc = templateDoc;
    //prepareTopElements()
    // if (!context.devMode) {
    //     doc.getHtmlElement().setAttribute("manifest", X.getContextPath() + "/x/_appcache");
    // }
    //prepareXBody()

    // Map<String, Object> jsonDynAtt = new HashMap<String, Object>();
    // Map<String, Map<String, Object>> jsonHiddenAtt = new HashMap<String, Map<String, Object>>();
    // Map<String, String> jsonComp = new HashMap<String, String>();

    // html = XTemplates.replaceVars(doc.getHTML(jsonDynAtt, jsonHiddenAtt, jsonComp));

    // StringBuilder postString = new StringBuilder();

    // postString.append("\n(function(){\n");
    // postString.append("\n		var X = new _XClass();");

    // //the main window should always register as it might have iterators, xscripts and dyn attribs
    // postString.append("\n		X._registerObjects(").append(XJson.toJson(jsonDynAtt))
    //         .append(",");
    // postString.append("\n			").append(XJson.toJson(jsonHiddenAtt)).append(",");
    // postString.append("\n			").append(XJson.toJson(iteratorList)).append(",");
    // postString.append("\n			").append(XJson.toJson(jsonComp)).append(",");
    // postString.append("\n			").append(XJson.toJson(components)).append(");");

    // if (!isSpaMainWindow) {
    //     postString.append("\n		X._getJS('" + resInfo.getPath() + ".p.js', null, function(){");
    //     postString.append("\n			console.log('X Loaded');");
    //     postString.append("\n		})");
    // } else {
    //     postString.append("\n         var xbody = document.getElementsByTagName('xbody')[0];");

    //     postString.append("\n         X$._xbodyNode = xbody;");
    //     postString.append("\n         X$._isSpa = true;");
    //     postString.append("\n         X$._xbodyNode.xsetModal = function(child){");
    //     postString.append("\n             X$._xbodyNode.appendChild(child);");
    //     postString.append("\n         };");

    //     postString.append("\n         var controller = new function(){var __xbinds__ = null; this._x_eval = function(f){return eval(f)};};");
    //     postString.append("\n         X._setEvalFn(controller._x_eval);");
    //     postString.append("\n         document.body.setAttribute('data-x_ctx', 'true');");
    //     postString.append("\n         X.setController(controller, function(){console.log('X started (spa)');});");
    //     postString.append("\n         X.setSpaModalNode(X$._xbodyNode);");
    // }
    // postString.append("\n})();");

    // html = html.replace("{xpostscript}", postString.toString());
    // tempBoundVars.put(resInfo.getPath() + ".js", boundVars);
    // tempBoundModals.put(resInfo.getPath() + ".js", boundModals);
    // strResponse = html;
}

//add child element of this doc that can be cached with appcache
const _addChildValidElements = (resInfo, doc) => {
    doc.getElementsByName("script").forEach(script => {
        const src = script.getAttribute("src");
        if (src && !src.startsWith("http://")) {
            _addPath(cached.validResources, src, resInfo.htmxRealPath);
        }
    });
    doc.getElementsByName("link").forEach(link => {
        const href = link.getAttribute("href");
        if (href) {
            addPath(validResources, href, resInfo.getRealPath());
        }
    });
}

const _compilePage = (resInfo, htmxData, jsData) => {
    console.log(`Loading htmx ${resInfo.path}`);
    //get all the bound variables in the page
    const boundVars = {};
    //get all the bound modals in the page
    const boundModals = {};
    const components = {};

    const doc = new htmlParser.HTMLParser().parse(htmxData, boundModals, boundVars);
    resInfo.templateName = null;
    if (!doc.htmlElement) {
        //has template
        resInfo.templateName = XTemplates.getTemplateName(htmxData, defaultTemplateName, resInfo.isImplicit());asdf
    }
    _reloadTemplate(resInfo.templateName);

    const iteratorList = [];

    //place real html of components, prepare iterators and labels
    XComponents.prepareHTML(doc, boundVars, boundModals, components, iteratorList, resInfo.modal);

    doc.requiredResourcesList.forEach(requiredElement => {
        const src = requiredElement.getAttribute("src");
        if (src.startsWith("/")) {
            src = src.substring(1);
        }
        addPath(validResources, "/res/" + src, resInfo.htmxRealPath);
    });
    const htmlStruct = doc.toJson();

    addChildValidElements(resInfo, doc);
    parei aqui    
    try {
            strResponse = XJS.instrumentController(strResponse, resInfo.getPath(),
                    boundVars, boundModals, resInfo.modal, resInfo.global, htmlStruct, XJson.toJson(components), (JsResource) resInfo);
        } catch (ScriptException e) {
            String msg = "Error in script: " + resInfo.getRealPath();
            console.error(msg, e);
            throw new RuntimeException(msg, e);
        }
    }
    if (boundModals != null) {
        for (XModalBind modal : boundModals.values()) {
            addPath(modalPathsDeclared, modal.getPath(), resInfo.getRealPath());
        }
    }
    page = strResponse.replace(/\{webctx}/g, X.getContextPath()).getBytes("UTF-8");
    return page;
}