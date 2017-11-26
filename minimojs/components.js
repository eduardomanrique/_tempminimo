const logger = require('./logging');
const _ = require('underscore');
const resources = require('./resources');
const ctx = require('./context');
const esprima = require('esprima');
const esprimaUtil = require('./esprimaUtil');
const htmlParser = require('./htmlParser');
const types = require('./component-types').types;
const isComponentType = require('./component-types').isComponentType;
const util = require('./util');

let _componentsScript;
let _componentsInfo;
let _componentsCtx = {};
let _componentsHtmxSources;
let _componentTypes;

const _generateId = (prefix) => (prefix || "id_") + parseInt(Math.random() * 999999);

function __setUpGetterForAttributes(obj, evaluator, internalEval, __instanceProperties, _attrs, __types) {
  function _createProperty(obj, k, tp, a){
    Object.defineProperty(obj, k, { get: function () {
      if(tp.getTypeName() == 'boundVariable'){
        return evaluator.eval(a);
      }else if(tp.getTypeName() == 'bind'){
        return a;
      }else{
        var val = (a instanceof Array ? a : [a]).map(i => typeof(i) == 'string' ? i : internalEval.eval(i.s)).join('');
        return tp.convert(val);
      }
    }});
  }
  for(var k in __instanceProperties) {
    var tp = __instanceProperties[k];
    if(__types.isComponentType(tp)){
      _createProperty(obj, k, tp, _attrs[k])
    }else{
      obj[k] = obj[k] || {};
      __setUpGetterForAttributes(obj[k], evaluator, internalEval, tp, _attrs[k], __types)
    }
  }
}

const startComponents = () => loadComponents().then(componentsInfo => {
  _componentsInfo = componentsInfo.info;
  _componentsHtmxSources = componentsInfo.htmxSources
  return resources.readModuleFile('./component-types.js').then((componentTypes) => {
    //for client
    _componentTypes = `(function(){
      var module = {};
      ${componentTypes}
      return module.exports;
    })()`;
    _componentsScript = `(function(){
      ${componentsInfo.scripts}
      return components;
      })()`;
    //for compiler
    const script = `(function(){
      var __types = ${_componentTypes};
      ${__setUpGetterForAttributes.toString()}
      var m = {generatedId: function(){return 'ID${parseInt(Math.random() * 999999)}';}, _addExecuteWhenReady: function(){}};
      ${componentsInfo.scripts}
      _componentsCtx.components = components;
      })();`;
    eval(script);
  });
});



const loadComponents = () =>
  resources.getResources("./components", r => (r.endsWith(".js") || r.endsWith(".htmx")) && !r.match(/[^/]+$/)[0].startsWith("."))
    .then(values => {
      return _.mapObject(_.groupBy(values, resource => resource.path.substring(0, resource.path.lastIndexOf('.'))), (v, k) => {
        let result = {};
        v.forEach(item => {
          let ext = item.path.substring(item.path.lastIndexOf('.')+1);
          if(ext == 'htmx' || ext == 'js'){
            result[ext] = item.data;
          }
        });
        return result;
      })})
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
      throw new Error('Must have htmx for now');
    }
    if (!compName.startsWith("_")) {
      js.push(`components['${compName}']=${varPath};`);
      info.push(_createComponentVO(compName, varPath, hasHtmx));
    }
  });
  let nameAndPath = info.map(c => `["${c.resourceName}","${c.varPath}"],`).join('');
  return {
    scripts: `var _comps = [${nameAndPath}];
      ${js.join('')}`,
    info: info,
    htmxSources: htmxSources
  };
}

const _exposeFunctions = (js) => {
    const parsed = esprima.parse(js);
    return esprimaUtil.getFirstLevelFunctions(parsed).map(e => `this.${e} = ${e};`).join('\n');
}

const _createHtmxComponent = (compJs = "", varPath, compName) =>
  `${varPath} = new function(){
     this.htmxContext = function(_attrs, __m, __types){
       var selfcomp = this;
       this._compName = '${compName}';
       this.eval = function(s){
          var r = eval(s);
          return r;
       };
       ${compJs};
       ${_exposeFunctions(compJs)};
        this.__defineAttributes = function(){
          try{
           var r = defineAttributes(__types.types);
           if(_attrs){
            __setUpGetterForAttributes(selfcomp, __m, this, r, _attrs, __types);
           }
           return r;
          }catch(e){return {}}
        }
       

       var generateId = m.generateId;
     }
   };`

const _prepareDefinedAttributes = (element, definedAttributes, boundVars) => {
  const result = {};
  _.mapObject(definedAttributes, (val, key) => {
      if (!isComponentType(val)) {
          result[key] = element.findAllChildren(key).map(child => {
            child.remove();
            return _prepareDefinedAttributes(child, val, boundVars);
          });
      } else {
          const attType = val;
          if (attType == types.bind || attType == types.mandatory.bind) {
              //bind dont go to client. It is rendered on compile time
              boundVars[key] = element.getAttribute(key.toLowerCase());
          } else if (attType == types.html || attType == types.mandatory.html) {
              result[key] = element.children.map(c => c.toJson())
          } else {
              const attributeValue = element.getAttributeJsonFormat(key.toLowerCase());
              //attribute
              if(!attributeValue && !attType.hasDefaultValue() && attType.isMandatory()){
                throw new Error(`Attribute ${key} of type ${attType.toString()} is mandatory!`);
              }
              result[key] = !attributeValue ? (attType.hasDefaultValue() ? [attType.getDefaultValue()] : null) : attributeValue.value;
          }
      }
  });
  return result;
}
const _childInfoHtmxFormat = (componentName, element) => {
    const boundVars = {}
    let _defAttrib;
    eval(`_defAttrib = new _componentsCtx.${componentName}.htmxContext(null, {}, ${_componentTypes}).defineAttributes`);
    return [_defAttrib ? _prepareDefinedAttributes(element, _defAttrib(types), boundVars) : {}, boundVars];
}
const _removeHTML = (instanceProperties) => {
  map = {};
  _.mapObject(instanceProperties, (value, key) => {
      if (key != 'html') {
        map[key] = _.isObject(value) && !_.isArray(value) ? _removeHTML(value) : value;
      }
  });
  return map;
}
const _getElement = (element, name) => {
  const found = element.getElementsByName(name);
  if (!_.isEmpty(found)) {
      return found[0];
  }
  return null;
}
const _configComponentBinds = (componentDoc, htmxBoundVars) =>
  componentDoc.getElementsWithAttribute("bind").forEach(e => {
      const val = e.getAttribute("bind");
      if (htmxBoundVars[val]) {
          e.setAttribute("bind", htmxBoundVars[val]);
      }
  });
  
const _buildComponentOnPage = (compInfo, element, doc, boundVars, boundModals) => {
  const componentName = compInfo.varPath;
  // get declared properties in doc tag - config
  let [instanceProperties, htmxBoundVars] = _childInfoHtmxFormat(componentName, element);
  // get declared properties in doc tag - finish
  // generate html
  const newHTML = _componentsHtmxSources[componentName].replace(/\{mContent}/, "<_temp_x_body/>");
   const parser = new htmlParser.HTMLParser();
  const componentDoc = parser.parse(newHTML);
  _configComponentBinds(componentDoc, htmxBoundVars);
  
  if (boundVars) {
    _.values(htmxBoundVars).filter(v => v != null).map(v => v.split('.')[0]).forEach(v => boundVars.push(v));
    parser.boundObjects.forEach(e => boundVars.push(e));
  }
  if (boundModals) {
    parser.boundModals.forEach(e => boundModals.push(e));
  }
  componentDoc.requiredResourcesList.forEach(doc.requiredResourcesList.push);

  const compWrapper = new ComponentWrapper(compInfo, _removeHTML(instanceProperties), componentDoc.children);
  const tempBody = _getElement(compWrapper, "_temp_x_body");
  if (tempBody) {
    const insertPoint = tempBody.parent;
    tempBody.remove();
    element.children.forEach(e => insertPoint.addChild(e));
  }
  element.replaceWith(compWrapper);
}

const _findDeepestComponent = (doc) => {
  const _findDeepest = (e, currentFoundComponent, comp, compList) => {
    const deepest = e.findDeepestChild(comp.resourceName);
    if(_.isEmpty(compList)){
      return deepest ? util.optionOf([deepest, comp]) : 
        currentFoundComponent ? util.optionOf([e, currentFoundComponent]) : 
        util.emptyOption();
    }
    return _findDeepest(deepest || e, deepest ? comp : currentFoundComponent, _.first(compList), _.rest(compList));
  }
  return _.isEmpty(_componentsInfo) ? util.emptyOption() : _findDeepest(doc, null, _.first(_componentsInfo), _.rest(_componentsInfo));
}

const buildComponentsOnPage = (doc, boundVars, boundModals) => 
  _findDeepestComponent(doc).ifPresent(([element, component]) => {
    _buildComponentOnPage(component, element, doc, boundVars, boundModals);
    buildComponentsOnPage(doc, boundVars, boundModals);
  });

  //not supposed to be parsed, just created in compile time
class ComponentWrapper extends htmlParser.Element {
  constructor(comp, instanceProperties, childList){
    super();
    this.addChildList(childList);
    this._id = _generateId();
    this._compInfo = comp;
    this._instanceProperties = _.isEmpty(instanceProperties) ? undefined : instanceProperties;
  }
  get name() {
    return "";
  }
  toJson(){
    return {
      ci: this._id,
      cn: this._compInfo.resourceName,
      ip: this._instanceProperties,
      c: this.childrenToJson()
    };
  }
}

//TODO no browser, criar os getters (tipados) para as propriedades que nao sejam boundvariable, ou bind (tudo script)
module.exports = {
  loadComponents: loadComponents,
  buildComponentsOnPage: buildComponentsOnPage,
  startComponents: startComponents,
  _childInfoHtmxFormat: _childInfoHtmxFormat,
  _findDeepestComponent: _findDeepestComponent,
  getSetUpGetterForAttributesScript: () => __setUpGetterForAttributes.toString(),
  getComponentTypes: () => _componentTypes,
  forEachComponent: (fn) => _componentsInfo.forEach(fn),
  getScripts: () => _componentsScript
}