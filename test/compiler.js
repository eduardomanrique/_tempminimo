require('./test');
const compiler = require('../minimojs/compiler');
const resources = require('../minimojs/resources');
const expect = require('chai').expect;
const components = require('../minimojs/components');
const htmlParser = require('../minimojs/htmlParser');
const util = require('../minimojs/util');
const context = require('../minimojs/context');
const _ = require('underscore');
const chai = require('chai')
const spies = require('chai-spies');
const fs = require('fs');

chai.use(spies);

const _reloadTemplate = compiler._reloadTemplate;

describe('Test compiler', function () {
    it('Get resource info htmx/js OK', () => compiler._restart()
        .then(() => compiler._getResourceInfo('/dir1/test1.htmx', false)
            .then(resourceOption => {
                expect(resourceOption.isPresent()).to.be.true;
                resourceOption.ifPresent(resource => {
                    resource.relativeHtmxPath.value.should.equal('./pages/dir1/test1.htmx');
                    resource.relativeJsPath.value.should.equal('./pages/dir1/test1.js');
                    expect(resource.htmxRealPath.value).to.endsWith('/pages/dir1/test1.htmx');
                    expect(resource.jsRealPath.value).to.endsWith('/pages/dir1/test1.js');
                    resource.htmxPath.value.should.equal('/dir1/test1.htmx');
                    resource.jsPath.value.should.equal('/dir1/test1.js');
                    expect(resource.templateName.value).to.be.null;
                    expect(resource.isGlobal).to.be.false;
                    expect(resource.htmxPath.isPresent()).to.be.true;
                    expect(resource.jsPath.isPresent()).to.be.true;
                });
            })));
    it('Get resource info htmx/js Non existent', () => compiler._restart()
        .then(() => compiler._getResourceInfo('/testqq1.htmx', false)
            .then(resourceOption => {
                expect(resourceOption.isPresent()).to.be.false;
            })));
    it('Get resource info js Only', () => compiler._restart()
        .then(() => compiler._getResourceInfo('/dir2/jsonly.htmx', false)
            .then(resourceOption => {
                expect(resourceOption.isPresent()).to.be.true;
                resourceOption.ifPresent(resource => {
                    resource.htmxPath.isPresent().should.be.false;
                    resource.jsPath.isPresent().should.be.true;
                    resource.relativeJsPath.value.should.equal('./pages/dir2/jsonly.js');
                });
            })));
    it('Get resource info htmx Only', () => compiler._restart()
        .then(() => compiler._getResourceInfo('/dir2/htmxonly.js', false)
            .then(resourceOption => {
                expect(resourceOption.isPresent()).to.be.true;
                resourceOption.ifPresent(resource => {
                    resource.htmxPath.isPresent().should.be.true;
                    resource.jsPath.isPresent().should.be.false;
                    resource.relativeHtmxPath.value.should.equal('./pages/dir2/htmxonly.htmx');
                });
            })));
    it ('Prepare injections', () => {
        const js = `
        //import:/import/i1
        var i;
        //import:/import/i2
        var i2;
        //modal:/modal/modal1,element,toggle
        var modal1;
        //modal:/modal/modal2,element
        var modal2;
        `;
        const prepared = compiler._prepareInjections(js, [new htmlParser.ModalBind('modal3', '/modal/modal3', 'element3', true)]);
        const imported = [];
        const instance = {};
        const modals = [];
        const vars = {};
        let setVars;
        const X = {
            CTX: '_CTX',
            import: path => {
                imported.push(path);
                return new Promise((resolve) => resolve(instance))
            },
            bindService: name => services.push(name),
            modalS: (path, toggle, elementId) => {
                modals.push({t: toggle, p: path, e: elementId});
                return new Promise((resolve) => resolve(instance));
            }
        }
        var binds;
        eval(`${prepared}; 
            binds = __binds__;
            setVars = function(){
                vars.i=i;
                vars.i2=i2;
                vars.modal1=modal1;
                vars.modal2=modal2;
                vars.modal3=modal3;
            }`);
        return Promise.all(binds).then(() => {
            setVars();
            instance.CTX.should.equal('_CTX');
            imported.should.have.lengthOf(2);
            imported.filter(i => i == '/import/i1.js').should.have.lengthOf(1);
            imported.filter(i => i == '/import/i2.js').should.have.lengthOf(1);
            modals.should.have.lengthOf(3);
            modals.filter(i => i.t && i.p == '/modal/modal1' && i.e == 'element').should.have.lengthOf(1);
            modals.filter(i => !i.t && i.p == '/modal/modal2' && i.e == 'element').should.have.lengthOf(1);
            modals.filter(i => i.t && i.p == '/modal/modal3' && i.e == 'element3').should.have.lengthOf(1);
            expect(vars.i).to.be.equal(instance);
            expect(vars.i2).to.be.equal(instance);
            expect(vars.modal1).to.be.equal(instance);
            expect(vars.modal2).to.be.equal(instance);
            expect(vars.modal3).to.be.equal(instance);
        });
    });
    it ('Test instrument controller', () => {
        const parser = new htmlParser.HTMLParser();
        const docJson = parser.parse(`<html>
            <body>
                <input bind="obj.test">
                <div data-modal-mod="/modal/mod"></div>
            </body>
        </html>`).toJson();
        const boundVars = parser.boundVars;
        const boundModals = parser.boundModals;
        const jsData = util.optionOf(`
        var obj = {
            test:1
        };
        var mod;
        var init = 0;
        var change = 0;
        function onInit(){
            init = 1;
        }
        function onChange(){
            _privateFn();
        }
        function _privateFn(){
            change = 1;
        }
        `);
        const realPath = resources.getRealPath('/pages/dir1/test1.htmx');
        const resInfo = new compiler.Resource('/dir1/test1', true, true, realPath.substring(0, realPath.lastIndexOf('.')), false);
        const controllerJs = compiler._instrumentController(docJson, jsData, false, resInfo, boundVars, boundModals);
        
        let htmlStruct;
        let resourceName;
        const X = {
            _interval: 1,
            _timeout: 2,
            _clearInterval: 3,
            _clearTimeout: 4,
            modalS: (path, bool, id) => new Promise(resolve => resolve({}))
        };
        const X$ = {
            register: (html, name, constructorFn) => {
                htmlStruct = html;
                resourceName = name;
                return new constructorFn(X);
            }
        };
        var controller;
        eval(`controller = ${controllerJs}`);
        expect(controller.onInit).not.null;
        expect(controller.onChange).not.null;
        expect(controller.resourceName).to.be.eq('dir1.test1');
        expect(controller.__eval__('setInterval')).to.eq(1);
        expect(controller.__eval__('setTimeout')).to.eq(2);
        expect(controller.__eval__('clearInterval')).to.eq(3);
        expect(controller.__eval__('clearTimeout')).to.eq(4);
        expect(controller.__eval__('init')).to.eq(0);
        expect(controller.onInit).not.to.be.null;
        expect(controller.onChange).not.to.be.null;
        expect(controller._privateFn).not.to.be.null;
        controller.onInit();
        expect(controller.__eval__('init')).to.eq(1);
        expect(controller.__eval__('change')).to.eq(0);
        controller.onChange();
        expect(controller.__eval__('change')).to.eq(1);
        expect(controller.__eval__('mod')).not.null;
        var binds = controller.__eval__('__binds__');
        return Promise.all(binds).then(() => {
            expect(binds).to.have.lengthOf(1);
        })
    });
    it ('Get empty template data', () => 
        compiler._getTemplateData().then(data => {
            const doc = new htmlParser.HTMLParser().parse(data);
            doc.htmlElement.should.not.be.null;
            const body = _.first(doc.htmlElement.getElementsByName('body'));
            body.should.not.be.null;
            body.children.should.have.lengthOf(0);
        }));
    it ('Get non empty template data', () => 
        compiler._getTemplateData('tpl.htmx').then(data => {
            const doc = new htmlParser.HTMLParser().parse(data);
            doc.htmlElement.should.not.be.null;
            const body = _.first(doc.htmlElement.getElementsByName('body'));
            body.should.not.be.null;
            expect(body.children.length).be.greaterThan(4);
        }));
    it ('Prepare top elements', () => 
        compiler._getTemplateData('tpl.htmx').then(data => {
            const doc = new htmlParser.HTMLParser().parse(data);
            compiler._prepareTopElements(doc);
            const divLoader = _.first(doc.getElementsByName('body')).children[0];
            divLoader.getAttribute("id").should.be.equal('__temploader__');
        }));
    it ('Test add child to app cache', () => {
        compiler._resetAppcache();
        const realPath = resources.getRealPath('/pages/dir2/test_appcache.htmx');
        const resInfo = new compiler.Resource('/dir2/test_appcache', false, true, realPath.substring(0, realPath.lastIndexOf('.')), false);
        return components.startComponents().then(() => 
            Promise.all([resInfo.relativeHtmxPath.map(resources.readResource), resInfo.relativeJsPath.map(resources.readResource)])
                .then(([htmx, js]) => 
                    compiler._compilePage(resInfo, util.nullableOption(htmx).optionMap(v => v.data), util.nullableOption(js).optionMap(v => v.data))
                        .then(compiledPage => {
                            var a = compiler._appcache();
                            a.should.contain('/ctx/test.js');
                            a.should.contain('/ctx/abc/def.js');
                            a.should.contain('/ctx/x.js');
                            a.should.contain('/ctx/y.js');
                            a.should.contain('/css/tests.css');
                        })));
            });
    it ('Reload blank template', () => compiler._reloadTemplate('tpl.htmx').then(template => {
        const doc = new htmlParser.HTMLParser().parse(template);
        const body = _.first(doc.getElementsByName('body'));
        body.children.should.have.lengthOf(1);
        body.children[0].name.should.be.equal('script');
    }));
    it ('Compile page htmx and js no components no html element', () => {
        const spy = chai.spy(_reloadTemplate);
        compiler._reloadTemplate = spy;
        const realPath = resources.getRealPath('/pages/dir1/test1.htmx');
        const resInfo = new compiler.Resource('/dir1/test1', true, true, realPath.substring(0, realPath.lastIndexOf('.')), false);
        return components.startComponents().then(() => 
            Promise.all([resInfo.relativeHtmxPath.map(resources.readResource), resInfo.relativeJsPath.map(resources.readResource)])
            .then(([htmx, js]) => compiler._compilePage(resInfo, util.optionOf(htmx.data), util.optionOf(js.data)).then(compiled => {
                let instance;
                const X$ = {
                    register: (html, name, constructorFn) => {
                        htmlStruct = html;
                        resourceName = name;
                        instance = new constructorFn({});
                    }
                };
                eval(compiled);    
                instance.__eval__('param').should.be.eq(1);
                expect(spy).not.to.have.been.called;
            })));
    });
    it ('Compile page htmx and no js no components with template', () => {
        const spy = chai.spy(_reloadTemplate);
        compiler._reloadTemplate = spy;
        const realPath = resources.getRealPath('/pages/dir1/test1_template_no_js.htmx');
        const resInfo = new compiler.Resource('/dir1/test1_template_no_js', false, true, realPath.substring(0, realPath.lastIndexOf('.')), false);
        return components.startComponents().then(() => 
        Promise.all([resInfo.relativeHtmxPath.map(resources.readResource), resInfo.relativeJsPath.map(resources.readResource)])
            .then(([htmx, js]) => compiler._compilePage(resInfo, util.nullableOption(htmx).optionMap(v => v.data), util.nullableOption(js).optionMap(v => v.data)).then(compiled => {
                let instance;
                const X$ = {
                    register: (html, name, constructorFn) => {
                        htmlStruct = html;
                        resourceName = name;
                        instance = new constructorFn({});
                    }
                };
                eval(compiled);
                var param;
                instance.__eval__('param = 1');
                param = 3;
                instance.__eval__('param').should.be.eq(1);
                spy.should.have.been.called();
            })));
    });
    it ('Compile page js only', () => {
        const spy = chai.spy(_reloadTemplate);
        compiler._reloadTemplate = spy;
        const realPath = resources.getRealPath('/pages/dir2/jsonly.js');
        const resInfo = new compiler.Resource('/dir2/jsonly', true, false, realPath.substring(0, realPath.lastIndexOf('.')), false);
        return components.startComponents().then(() => 
        Promise.all([resInfo.relativeHtmxPath.map(resources.readResource), resInfo.relativeJsPath.map(resources.readResource)])
            .then(([htmx, js]) => compiler._compilePage(resInfo, util.nullableOption(htmx).optionMap(v => v.data), util.nullableOption(js).optionMap(v => v.data)).then(compiled => {
                let instance;
                const X$ = {
                    register: (html, name, constructorFn) => {
                        htmlStruct = html;
                        resourceName = name;
                        instance = new constructorFn({});
                    }
                };
                eval(compiled);
                var param;
                instance.__eval__('param = 1');
                param = 3;
                instance.__eval__('param').should.be.eq(1);
                spy.should.not.have.been.called();
            })));
    });
    it ('Compile page htmx and js with components', () => {
        const realPath = resources.getRealPath('/pages/dir1/with_components.htmx');
        const resInfo = new compiler.Resource('/dir1/with_components', true, true, realPath.substring(0, realPath.lastIndexOf('.')), false);
        return components.startComponents().then(() => 
            Promise.all([resInfo.relativeHtmxPath.map(resources.readResource), resInfo.relativeJsPath.map(resources.readResource)])
                .then(([htmx, js]) => compiler._compilePage(resInfo, util.nullableOption(htmx).optionMap(v => v.data), util.nullableOption(js).optionMap(v => v.data)).then(compiled => {
                    let instance;
                    const X$ = {
                        register: (html, name, constructorFn) => {
                            htmlStruct = html;
                            resourceName = name;
                            instance = new constructorFn({});
                        }
                    };
                    eval(compiled);
                    var bindV;
                    instance.__eval__('bindV = 1');
                    bindV = 3;
                    instance.__eval__('bindV').should.be.eq(1);
                    var obj = {val:null};
                    instance.__eval__('obj = {val:1}');
                    obj.val = 3
                    instance.__eval__('obj.val').should.be.eq(1);
                })));
    });
    it('Reload files', () => {
        context.destinationPath = `/tmp/minimojs_test${context.contextPath}`;
        return resources.rmDirR(context.destinationPath)
            .then(() => resources.mkdirTree(context.destinationPath))
            .then(compiler._restart)
            .then(compiler._reloadFiles)
            .then(() => [
                    resources.ls(`${context.destinationPath}/dir1`),
                    resources.ls(`${context.destinationPath}/dir2`)
                ].toPromise())
            .then(([dir1, dir2]) => {
                dir1.should.have.lengthOf(3);
                dir1.should.contain(`${context.destinationPath}/dir1/test1.js`);
                dir1.should.contain(`${context.destinationPath}/dir1/test1_template_no_js.js`);
                dir1.should.contain(`${context.destinationPath}/dir1/with_components.js`);
                dir2.should.have.lengthOf(3);
                dir2.should.contain(`${context.destinationPath}/dir2/htmxonly.js`);
                dir2.should.contain(`${context.destinationPath}/dir2/jsonly.js`);
                dir2.should.contain(`${context.destinationPath}/dir2/test_appcache.js`);
            })
            .then(() => resources.rmDirR(context.destinationPath));
    });
});