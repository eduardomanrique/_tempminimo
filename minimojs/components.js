const logger = require('./logging');
const _ = require('underscore');
const resources = require('./resources');
const util = require('./util');
const ctx = require('./context');
const esprima = require('esprima');
const esprimaUtil = require('./esprimaUtil');

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
    .then(_loadComponents)


module.exports = {
  loadComponents: loadComponents
}

const _createComponentVO = (resName, path, create, htmx) => {
  return {
    resourceName: resName,
    varPath: path,
    htmxStyle: htmx
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
