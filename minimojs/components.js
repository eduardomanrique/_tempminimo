const logger = require('./logging');
const resources = require('./resources');
const util = require('./util');
const ctx = require('./context');
const esprimaUtil = require('./esprimaUtil');

const loadComponents => ()
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
        })
      .then(_loadComponents)


module.exports = {
  loadComponents: loadComponents
}

const _createComponentVO = (resName, path, create, htmx) =>
  {
    resourceName: resName,
    varPath: path,
    htmxStyle: htmx
  }

const _loadComponents = groupedResources => {
  const js = ["var components = {};"];
  const info = [];
  const htmxSources = {}

  //component folder
  Object.entries(groupedResources).forEach(entry => {
    const path = entry.key;
    const parts = path.split("/");
    const resourceName = _.last(parts);

    const compParts = parts.map(part => `['${part}']`)

    js.push(compParts.map(p => `${p}={};`).join());

    const compName = parts.filter((part, i) => i > 1).joins('.');
    const varPath = `components${compParts.join()}['${resourceName}']`;

    const hasHtmx = entry.value.htmx;
    if (hasHtmx) {
      htmxSources[varPath] = entry.value.htmx;
      js.push(_createHtmxComponent(entry.value.js, varPath, compName));
    } else {
      js.push(_createOldTypeComponent(entry.value.js, varPath));
    }
    if (!compName.startsWith("_")) {
      js = js.push(`components['${compName}']=${varPath};`);
      info.push(_createComponentVO(compName, varPath, hasHtmx));
    }
  });
  let nameAndPath = info.map(c => `["${c.resourceName}","${c.varPath}"],`).join();
  return {
    scripts: `var _comps = [${nameAndPath}];${js.join().replace(/\{webctx\}/g, ctx.contextPath)}`,
    componentInfo: info,
    htmxSources: htmxSources
  };
}

const _createOldTypeComponent = (compJS, varPath) =>
  `${varPath} = new function(){
      var toBind = {};
      this.get = (id) => Object.assign({id:id}, toBind);
      const bindToHandle = (obj) => Object.assign(toBind, obj);
      const expose = (name, fn) =>  ${varPath}[name] = fn;
      var load;
      ${compJS};
      try{
        this.context = context;
      }catch(e){};
      this.getHtml = getHtml;
      try{
        this.getBindingMethods = getBindingMethods;
      }catch(e){};
      var generateId = X.generateId;
      try{
        this.childElementsInfo = childElementsInfo;
      }catch(e){
        this.childElementsInfo = () => new Object();
      };
      try{
        X._addExecuteWhenReady(load);
      }catch(e){};
      try{
        this.onReady = onReady;
      }catch(e){};
      try{
        this.onVisible = onVisible;
      }catch(e){};
    };`;

const _createHtmxComponent = (compJs, varPath, compName) =>
  `${varPath} = new function(){
     this.htmxContext = function(attrs){
       var selfcomp = this;
       this._attrs = attrs;
       this._compName = '${compName}';
       this._xcompEval = function(f){
         try{
           return eval(f);
         }catch(e){
           throw new Error('Error executing script component ' + this._compName + '. Script: ' + f + '. Cause: ' + e.message);
         }
       };
       ${js};
       ${esprimaUtil.exposeFunctions(compJs, "", "this")};
       var generateId = X.generateId;
     }
   };`
