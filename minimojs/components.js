const logger = require('./logging');
const _ = require('underscore');
const resources = require('./resources');
const util = require('./util');
const ctx = require('./context');
const esprima = require('esprima');
const esprimaUtil = require('./esprimaUtil');
const htmlParser = require('../minimojs/htmlParser');
const types = require('../minimojs/component-types').types;
const isComponentType = require('../minimojs/component-types').isComponentType;

let _componentsScript;
let _componentsInfo;
let _componentsCtx = {};
let _componentsHtmxSources;

const _generateId = (prefix) => (prefix || "id_") + parseInt(Math.random() * 999999);

const startComponents = () => loadComponents().then(componentsInfo => {
  _componentsScript = componentsInfo.scripts;
  _componentsInfo = componentsInfo.info;
  _componentsHtmxSources = componentsInfo.htmxSources
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
      return `${varPath}=${varPath}||{};`;
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
  _.mapObject(definedAttributes, (val, key) => {
      if (!isComponentType(val)) {
          result[key] = element.findAllChildren(key).map(child => _prepareDefinedAttributes(child, val, boundVars));
      } else {
          const value = element.getAttribute(key);
          const attType = val;
          if (attType == types.bind || attType == types.mandatory.bind) {
              //bind dont go to client. It is rendered on compile time
              boundVars[key] = value;
          } else if (attType == types.innerHTML || attType == types.mandatory.innerHTML) {
              result[key] = element.children.map(c => c.toJson())
          } else {
              //attribute
              if(!value && !attType.hasDefaultValue() && attType.isMandatory()){
                throw new Error(`Attribute ${key} of type ${attType.toString()} is mandatory!`);
              }
              result[key] = !value ? (attType.hasDefaultValue() ? attType.getDefaultValue() : null) : attType.convert(value);
          }
      }
  });
  return result;
}
const _childInfoHtmxFormat = (componentName, element) => {
    const boundVars = {}
    let _defAttrib;
    eval(`_defAttrib = new _componentsCtx.${componentName}.htmxContext(null, null).defineAttributes`);
    return [_prepareDefinedAttributes(element, _defAttrib(types), boundVars), boundVars];
}
const _removeHTML = (infoProperties) => {
  map = {};
  _.mapObject(infoProperties, (value, key) => {
      if (key != 'innerHTML') {
        map[key] = _.isObject(value) && !_.isArray(value) ? _removeHTML(value) : value;
      }
  });
  return map;
}
const _getElement = (element, name) => {
  const found = element.getElementsByName("_temp_x_body");
  if (!_.isEmpty(found)) {
      return found[0];
  }
  return null;
}
const _configBinds = (doc, htmxBoundVars) =>
  doc.getElementsWithAttribute("data-xbind").forEach(e => {
      const val = e.getAttribute("data-xbind");
      if (htmxBoundVars[val]) {
          e.setAttribute("data-xbind", htmxBoundVars[val]);
      }
  });
  
const buildComponentOnPage = (comp, element, doc, boundVars, boundModals) => {
  const componentName = comp.varPath;
  // get declared properties in doc tag - config
  let [infoProperties, htmxBoundVars] = _childInfoHtmxFormat(componentName, element);
  // get declared properties in doc tag - finish
  // generate html
  const newHTML = _componentsHtmxSources[componentName].replace(/\{xbody}/, "<_temp_x_body/>");
  const parser = new htmlParser.HTMLParser();
  const newDoc = parser.parse(newHTML);
  _configBinds(newDoc, htmxBoundVars);
  const id = _generateId();
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
    parser.boundObjects.forEach(e => boundVars.push(e));
  }
  if (boundModals) {
    parser.boundModals.forEach(e => boundModals.push(e));
  }
  newDoc.requiredResourcesList.forEach(doc.requiredResourcesList.push)
  let newNode = newDoc.children[0];
  element.replaceWith(newNode);
  _.rest(newDoc.children).forEach(node => {
    newNode.addAfter(node);
    newNode = node;
  });
}

const _findDeepestComponent = (doc) => {
  const _findDeepest = (e, currentFoundComponent, comp, compList) => {
    const deepest = e.findDeepestChild(comp.resourceName);
    if(_.isEmpty(compList)){
      return [deepest||e, currentFoundComponent]
    }
    return _findDeepest(deepest || e, deepest ? comp : currentFoundComponent, _.first(compList), _.rest(compList));
  }
  return _findDeepest(doc, null, _.first(_componentsInfo), _.rest(_componentsInfo));
}

const buildComponentsOnPage = (doc, boundVars, boundModals) => {
  while(true){
    const [element, component] = _findDeepestComponent(doc);
    if(component){
      buildComponentOnPage(component, element, doc, boundVars, boundModals);
    }else{
      break;
    }
  }
}
//TODO no browser, criar os getters (tipados) para as propriedades que nao sejam boundvariable, ou bind (tudo script)
module.exports = {
  loadComponents: loadComponents,
  buildComponentsOnPage: buildComponentsOnPage,
  startComponents: startComponents,
  _childInfoHtmxFormat: _childInfoHtmxFormat,
  _findDeepestComponent: _findDeepestComponent
}