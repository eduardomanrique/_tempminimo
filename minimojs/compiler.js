const resources = require('../minimojs/resources');
const htmlParser = require('../minimojs/htmlParser');
const components = require('../minimojs/components');

const context = require('../minimojs/context');
const fs = require('fs');
const _basePagesPath = './pages';
const _baseResPath = './res';
const _htmxStrLength = ".htmx".length();
let _cached;
let componentsScript;
let componentsInfo;

const _restart = () => new Promise(() => 
    _cached = {
        modalPathsDeclared: {},
        appcacheResources: new Set(),
        importableScripts: {},
        templateMap: {},
        allResources: {},
        importableResourceInfo: {},
        resourceInfoMap = {}
    });

const compileResources = (destDir, defaultTemplateName) => 
    components.loadComponents().then(componentsInfo => {
        componentsScript = componentsInfo.scripts;
        componentsInfo = componentsInfo.info;
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
    });

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
        .then(values => values.forEach(htmxFile => {
            let path = htmxFile.path.substring(_basePagesPath.length, htmxFile.path.length - _htmxStrLength);
            const resInfo = _getResourceInfo(path);
            //load html main window
            resources.readResource(resInfo.jsRealPath).then(jsFile => {
                let compiledPage = _compilePage(resInfo, htmxFile.data, jsFile.data);
                _loadFileAndCache(resInfo, compiledPage);
                _cached.importableResourceInfo[path] = new ImportableResourceInfo(path, htmxResInfo.templateName);
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

const _buildComponent = (comp, doc, boundVars, boundModals) => {
    const componentName = comp.varPath;
    let element;
    while ((element = doc.findDeepestChild(comp.resourceName))) {
        // get declared properties in doc tag - config
        const infoProperties = {};
        const htmxBoundVars = null;
        if (comp.htmxStyle) {
            htmxBoundVars = childInfoHtmxFormat(componentName, element, infoProperties);
        } else {
            childInfoOldFormat(componentName, element, infoProperties);
        }
        // get declared properties in doc tag - finish
        // generate html
        const newHTML = getHtml(componentName, infoProperties);
if (infoProperties.containsKey("xid")) {
newHTML = "<div _s_xid_='" + infoProperties.get("xid") + "'></div>" + newHTML + "<div _e_xid_='"
+ infoProperties.get("xid") + "'></div>";
}

// change xbody
newHTML = XStringUtil.replaceFirst(newHTML, "{xbody}", "<_temp_x_body/>");

// parse new html
XHTMLParser parser = new XHTMLParser();
XHTMLDocument newDoc = parser.parse(newHTML);
if (comp.htmxStyle) {
configBinds(newDoc, htmxBoundVars);
}
String id = generateId();
newDoc.setHiddenAttributeOnChildren("xcompId", id);
newDoc.setHiddenAttributeOnChildren("xcompName", comp.resourceName);
infoProperties.put("xcompId", id);
infoProperties = removeHTML(infoProperties);

List<XElement> findBody = newDoc.getElementsByName("_temp_x_body");
if (!findBody.isEmpty()) {
if (element.getChildren().isEmpty()) {
findBody.get(0).remove();
} else {
XNode node = element.getChildren().get(0);
findBody.get(0).replaceWith(node);
for (int i = 1; i < element.getChildren().size(); i++) {
XNode child = element.getChildren().get(i);
node.addAfter(child);
node = child;
}
}
}
if (boundVars != null) {
if (comp.htmxStyle) {
for (String var : htmxBoundVars.values()) {
boundVars.add(var.split("\\.")[0]);
}
}
boundVars.addAll(parser.getBoundObjects());
}
if (boundModals != null) {
boundModals.putAll(parser.getBoundModals());
}
requiredList.addAll(newDoc.getRequiredResourcesList());
List<XNode> list = newDoc.getChildren();
XNode newNode = list.get(0);
element.replaceWith(newNode);
for (int i = 1; i < list.size(); i++) {
XNode auxNode = list.get(i);
newNode.addAfter(auxNode);
newNode = auxNode;
}
List<Map<String, Object>> listByComponent = components.get(comp.resourceName);
if (listByComponent == null) {
listByComponent = new ArrayList<Map<String, Object>>();
components.put(comp.resourceName, listByComponent);
}

listByComponent.add(infoProperties);
}
}

const _prepareHTML = (doc, boundVars, boundModals) => {
    componentsInfo.forEach(comp => _buildComponent(comp, doc, boundVars, boundModals));
    prepareIterators(doc, iteratorsList, isModal);
    prepareLabels(doc);
    XElement recValues = new XElement("xrs", doc);
    recValues.addChildList(doc.requiredResourcesList);
    doc.addChild(recValues)
}