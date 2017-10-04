const resources = require('../minimojs/resources');
const htmlParser = require('../minimojs/htmlParser');
const components = require('../minimojs/components');

const context = require('../minimojs/context');
const fs = require('fs');
const _basePagesPath = './pages';
const _baseResPath = './res';
const _htmxStrLength = ".htmx".length();
let _cached;
let _componentsScript;
let _componentsInfo;
let _componentsCtx;
let _componentsHtmxSources;

const _restart = () => new Promise(() => 
    _cached = {
        modalPathsDeclared: {},
        appcacheResources: new Set(),
        importableScripts: {},
        templateMap: {},
        allResources: {},
        importableResourceInfo: {},
        resourceInfoMap = {},
        listByComponent = {}
    });

const compileResources = (destDir, defaultTemplateName) => 
    components.loadComponents().then(_componentsInfo => {
        _componentsScript = _componentsInfo.scripts;
        _componentsInfo = _componentsInfo.info;
        _componentsHtmxSources = _componentsInfo.htmxSources
        eval(`(()=>{
        var X = {generatedId: function(){return 'ID${parseInt(Math.random() * 999999)}';}, _addExecuteWhenReady: function(){}};
        ${_componentsScript}
        _componentsCtx.components = components;
        })();`);
        return resources.copy(_baseResPath, destDir)
            .then(resources.copy(baseResPath, `${destDir}/res`))
            .then(_restart)
            .then(_reloadHtmxFiles)
            .then(_reloadJsFiles)
            .then(_reloadGlobalImported)
            .then(_generateAppCacheFile)
            .then(_startWatchService)
            .then(_collectAllResources)
            .then(_reloadCommonResources)
    }).catch((e) => console.log(`Error: ${e.message}`));

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
        //ref to html (loader html)
        this.path = null;
        //ref to js with struct and controller
        this.jsPath = null;
        //disk path to generated js file
        this.jsRealPath = null;
        //relative path to generated js file
        this.relativeJsPath = null;
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
        if(!resources.exists(result.relativeJsPath)){
            _cached.resourceInfoMap[path] = {empty: true};
            return null;
        }
        result.path = path;
        result.jsPath = `${noExtensionPath}${isDir?'/index':''}.js`;
        _cached.resourceInfoMap[path] = result;
        _cached.appcacheResources.add(path);
        _cached.appcacheResources.add(result.jsPath);
    }
    return resInfo.empty ? null : resInfo;
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
    resources.readResource(resInfo.jsRealPath).then(jsFile => {
        let compiledPage = _compilePage(resInfo, htmxFile.data, jsFile.data);
        _loadFileAndCache(resInfo, compiledPage);
        _cached.importableResourceInfo[path] = new ImportableResourceInfo(path, htmxResInfo.templateName);
    });
}

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
    const doc = new htmlParser.HTMLParser().parse(htmxData, boundModals, boundVars);
    resInfo.templateName = null;
    if (!doc.htmlElement) {
        //has template
        let templateInfo = doc.getElementsByName("template-info");
        if(templateInfo.length > 0){
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

    _reloadTemplate(resInfo.templateName);//TODO

    //place real html of components, prepare iterators and labels
    _prepareHTML(doc, boundVars, boundModals);

    doc.requiredResourcesList.forEach(requiredElement => {
        const src = requiredElement.getAttribute("src");
        if (src.startsWith("/")) {
            src = src.substring(1);
        }
        _cached.appcacheResources.add("/res/" + src);
    });
    const htmlStruct = doc.toJson();

    _.values(boundModals).forEach(modal => _cached.appcacheResources.add(modal.path));
    _addChildValidElements(resInfo, doc);
    return _instrumentController(htmlStruct, jsData, boundVars, boundModals);
}


const _prepareHTML = (doc, boundVars, boundModals) => {
    _componentsInfo.forEach(comp => components.buildComponentOnPage(comp, doc, boundVars, boundModals));
    
}

listByComponent.add(infoProperties);
}

    prepareIterators(doc, iteratorsList, isModal);
    prepareLabels(doc);
    XElement recValues = new XElement("xrs", doc);
    recValues.addChildList(doc.requiredResourcesList);
    doc.addChild(recValues)
}