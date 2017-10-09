const logger = require('./logging');
const _ = require('underscore');
const resources = require('./resources');
const util = require('./util');
const ctx = require('./context');
const esprima = require('esprima');
const esprimaUtil = require('./esprimaUtil');

let _componentsScript;
let _componentsInfo;
let _componentsCtx = {};
let _componentsHtmxSources;

const startComponents = () => loadComponents().then(_componentsInfo => {
  _componentsScript = _componentsInfo.scripts;
  _componentsInfo = _componentsInfo.info;
  _componentsHtmxSources = _componentsInfo.htmxSources
  eval(`(()=>{
  var X = {generatedId: function(){return 'ID${parseInt(Math.random() * 999999)}';}, _addExecuteWhenReady: function(){}};
  ${_componentsScript}
  _componentsCtx.components = components;
  })();`);
});

const loadComponents = () =>
  resources.getResources("./components", r => (r.endsWith(".js") || r.endsWith(".htmx")) && !r.match(/[^/]+$/)[0].startsWith("."))
    .then(values =>
      _.mapObject(_.groupBy(values, resource => resource.path.substring(0, resource.path.lastIndexOf('.'))), (v, k) => {
        let result = {};
        v.forEach(item => {
          let ext = item.path.substring(item.path.lastIndexOf('.')+1);
          if(ext == 'htmx' || ext == 'js'){
            result[ext] = item.data;
          }
        });
        return result;
      }))
    .then(_loadComponents);

const _createComponentVO = (resName, path, isHtmx) => {
  return {
    resourceName: resName,
    varPath: path,
    htmxStyle: isHtmx
  }
}

const _loadComponents = (groupedResources) => {
  const js = ["var components = {};"];
  const info = [];
  const htmxSources = {}

  //component folder
  _.pairs(groupedResources).forEach(pair => {
    const [key, value] = pair;
    const path = key.substring("./components/".length);
    const parts = path.split("/");
    const resourceName = _.last(parts);
    const compParts = parts.map(part => `['${part}']`)
    let varPath = 'components';
    js.push(_.initial(compParts).map(p => {
      varPath += p;
      return `${varPath}={};`;
    }).join(''));

    const compName = parts.join('.');
    varPath += _.last(compParts);

    const hasHtmx = value.htmx != null;
    if (hasHtmx) {
      htmxSources[varPath] = value.htmx;
      js.push(_createHtmxComponent(value.js, varPath, compName));
    } else {
      js.push(_createOldTypeComponent(value.js, varPath));
    }
    if (!compName.startsWith("_")) {
      js.push(`components['${compName}']=${varPath};`);
      info.push(_createComponentVO(compName, varPath, hasHtmx));
    }
  });
  let nameAndPath = info.map(c => `["${c.resourceName}","${c.varPath}"],`).join('');
  return {
    scripts: `var _comps = [${nameAndPath}];
      ${js.join('').replace(/\{webctx\}/g, ctx.contextPath)}`,
    info: info,
    htmxSources: htmxSources
  };
}

const _exposeFunctions = (js) => {
    const parsed = esprima.parse(js);
    return esprimaUtil.getFirstLevelFunctions(parsed).map(e => `this.${e} = ${e};`).join('\n');
}

const _createOldTypeComponent = (compJS, varPath) =>
  `${varPath} = new function(){
      var toBind = {};
      this.get = function(id) {return Object.assign({id:id}, toBind)};
      var bindToHandle = function(obj) {return Object.assign(toBind, obj)};
      var expose = function(name, fn)  {${varPath}[name] = fn};
      var load;
      ${compJS};
      try{ this.context = context; }catch(e){};
      this.getHtml = getHtml;
      try{ this.getBindingMethods = getBindingMethods; }catch(e){};
      var generateId = X.generateId;
      try{ this.childElementsInfo = childElementsInfo; }catch(e){ this.childElementsInfo = function(){return {}} };
      try{ X._addExecuteWhenReady(load); }catch(e){};
      try{ this.onReady = onReady; }catch(e){};
      try{ this.onVisible = onVisible; }catch(e){};
    };`;

const _createHtmxComponent = (compJs, varPath, compName) =>
  `${varPath} = new function(){
     this.htmxContext = function(_attrs, _evalFn){
       var selfcomp = this;
       this._attrs = _attrs;
       this._compName = '${compName}';
       this._xcompEval = _evalFn;
       ${compJs};
       ${_exposeFunctions(compJs)};
       var generateId = X.generateId;
     }
   };`

const _prepareDefinedAttributes = (element, definedAttributes, boundVars) => {
  const result = {};
  _.mapObject(definedAttributes, (key, val) => {
      if (_.isObject(val) && !_.isArray(val)) {
          result[key] = element.findAllChildren(key).map(child => _prepareDefinedAttributes(child, val, boundVars));
      } else {
          const value = element.getAttribute(key);
          const attType = val;
          if (attType == components.types.bind || attType == components.types.mandatory.bind) {
              //bind dont go to client. It is rendered on compile time
              boundVars[key] = value;
          } else if (attType == components.types.innerHTML || attType == components.types.mandatory.innerHTML) {
              result[key] = element.innerHTML();
          } else {
              //attribute
              result[key] = value;
          }
      }
  });
  return result;
}
const _childInfoHtmxFormat = (componentName, element) => {
    const boundVars = {}
    let _defAttrib;
    eval(`_defAttrib = new _componentsCtx.components.${componentName}.htmxContext(null, null).defineAttributes`);
    return [_prepareDefinedAttributes(element, _defAttrib(Types), boundVars), boundVars];
}
const _removeHTML = (infoProperties) => {
  map = {};
  _.mapObject(infoProperties, (key, value) => {
      if (key != 'innerHTML') {
        map[key] = _.isObject(value) && !_.isArray(value) ? _removeHTML(value) : value;
      }
  });
  return map;
}
const _getElement = (element, name) => {
  const found = newDoc.getElementsByName("_temp_x_body");
  if (!_.isEmpty(findBody)) {
      return findBody[0];
  }
  return null;
}
const buildComponentOnPage = (comp, doc, boundVars, boundModals, componentsInfo) => {
  const componentName = comp.varPath;
  let element;
  while ((element = doc.findDeepestChild(comp.resourceName))) {
    // get declared properties in doc tag - config
    const [infoProperties, htmxBoundVars] = _childInfoHtmxFormat(componentName, element);
    // get declared properties in doc tag - finish
    // generate html
    const newHTML = _componentsHtmxSources[componentName].replace(/\{xbody}/, "<_temp_x_body/>");
    const parser = new XHTMLParser();
    const newDoc = parser.parse(newHTML);
    _configBinds(newDoc, htmxBoundVars);
    const id = generateId();
    newDoc.setHiddenAttributeOnChildren("xcompId", id);
    newDoc.setHiddenAttributeOnChildren("xcompName", comp.resourceName);
    infoProperties['xcompId'] = id;
    infoProperties = _removeHTML(infoProperties);
    const tempBody = _getElement(newDoc, "_temp_x_body");
    if (tempBody) {
      if (_.isEmpty(element.children)) {
        tempBody.remove();
      } else {
        let node = element.children[0];
        tempBody.replaceWith(node);
        _.rest(element).forEach(child => {
          node.addAfter(child);
          node = child;
        });
      }
    }
    if (boundVars) {
      _.values(htmxBoundVars).forEach(v => boundVars.push(v.split('.')[0]));
      parser.boundObjects.forEach(boundVars.push);
    }
    if (boundModals) {
      parser.boundModals.forEach(boundModals.push);
    }
    newDoc.requiredResourcesList.forEach(doc.requiredResourcesList.push)
    let newNode = newDoc.children[0];
    element.replaceWith(newNode);
    _.rest(newDoc.children).forEach(node => {
      newNode.addAfter(node);
      newNode = node;
    });
    componentsInfo[id] = infoProperties;
  }
}

module.exports = {
  loadComponents: loadComponents,
  buildComponentOnPage: buildComponentOnPage,
  startComponents: startComponents,
  _childInfoHtmxFormat: _childInfoHtmxFormat
}