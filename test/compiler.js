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

describe('Test compiler', function () {
    before(() => context.destinationPath = `/tmp/minimojs_test`);
    beforeEach(() => resources.rmDirR(context.destinationPath)
        .then(() => resources.mkdirTree(context.destinationPath)));
    afterEach(() => resources.rmDirR(context.destinationPath));
    
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
        .then(() => compiler._getResourceInfo('/dir2/js-only.htmx', false)
            .then(resourceOption => {
                expect(resourceOption.isPresent()).to.be.true;
                resourceOption.ifPresent(resource => {
                    resource.htmxPath.isPresent().should.be.false;
                    resource.jsPath.isPresent().should.be.true;
                    resource.relativeJsPath.value.should.equal('./pages/dir2/js-only.js');
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
        const m = {
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
        const m = {
            setInterval: 1,
            setTimeout: 2,
            clearInterval: 3,
            clearTimeout: 4,
            modalS: (path, bool, id) => new Promise(resolve => resolve({}))
        };
        const M$ = {
            register: (html, name, constructorFn) => {
                htmlStruct = html;
                resourceName = name;
                return new constructorFn(m);
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
            body.children.should.have.lengthOf(1);
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
                            a.should.contain('/test.js');
                            a.should.contain('/abc/def.js');
                            a.should.contain('/x.js');
                            a.should.contain('/y.js');
                            a.should.contain('/css/tests.css');
                        })));
            });
    it ('Reload blank template', () => {
        const resInfo = new compiler.Resource('/path', true, true, '/path', false);
        resInfo.templateName = 'tpl.htmx';
        return compiler._reloadTemplate(resInfo).then(template => {
            const doc = new htmlParser.HTMLParser().parse(template);
            const body = _.first(doc.getElementsByName('body'));
            body.children.should.have.lengthOf(1);
            body.children[0].name.should.be.equal('script');
        });
    });
    it ('Compile page htmx and js no components no html element', () => {
        const realPath = resources.getRealPath('/pages/dir1/test1.htmx');
        const resInfo = new compiler.Resource('/dir1/test1', true, true, realPath.substring(0, realPath.lastIndexOf('.')), false);
        return components.startComponents().then(() => 
            Promise.all([resInfo.relativeHtmxPath.map(resources.readResource), resInfo.relativeJsPath.map(resources.readResource)])
            .then(([htmx, js]) => compiler._compilePage(resInfo, util.optionOf(htmx.data), util.optionOf(js.data)).then(scripts => {
                let instance;
                const M$ = {
                    register: (html, name, constructorFn) => {
                        htmlStruct = html;
                        resourceName = name;
                        instance = new constructorFn({});
                    }
                };
                eval(scripts.js);
                expect(scripts.globalJs).to.be.undefined;
                instance.__eval__('param').should.be.eq(1);
            })));
    });
    it ('Compile page htmx and no js no components with template', () => {
        const realPath = resources.getRealPath('/pages/dir1/test1_template_no_js.htmx');
        const resInfo = new compiler.Resource('/dir1/test1_template_no_js', false, true, realPath.substring(0, realPath.lastIndexOf('.')), false);
        return components.startComponents().then(() => 
        Promise.all([resInfo.relativeHtmxPath.map(resources.readResource), resInfo.relativeJsPath.map(resources.readResource)])
            .then(([htmx, js]) => compiler._compilePage(resInfo, util.nullableOption(htmx).optionMap(v => v.data), util.nullableOption(js).optionMap(v => v.data)).then(compiled => {
                let instance;
                const M$ = {
                    register: (html, name, constructorFn) => {
                        htmlStruct = html;
                        resourceName = name;
                        instance = new constructorFn({});
                    }
                };
                eval(compiled.js);
                expect(compiled.globalJs).to.be.undefined;
                var param;
                instance.__eval__('param = 1');
                param = 3;
                instance.__eval__('param').should.be.eq(1);
            })));
    });
    it ('Compile page js only', () => {
        const realPath = resources.getRealPath('/pages/dir2/js-only.js');
        const resInfo = new compiler.Resource('/dir2/js-only', true, false, realPath.substring(0, realPath.lastIndexOf('.')), false);
        return components.startComponents().then(() => 
        Promise.all([resInfo.relativeHtmxPath.map(resources.readResource), resInfo.relativeJsPath.map(resources.readResource)])
            .then(([htmx, js]) => compiler._compilePage(resInfo, util.nullableOption(htmx).optionMap(v => v.data), util.nullableOption(js).optionMap(v => v.data)).then(compiled => {
                let instance;
                const M$ = {
                    register: (html, name, constructorFn) => {
                        htmlStruct = html;
                        resourceName = name;
                        instance = new constructorFn({});
                    }
                };
                eval(compiled.js);
                var param;
                instance.__eval__('param = 1');
                param = 3;
                instance.__eval__('param').should.be.eq(1);
                instance.showSomething().should.be.equal('Param: 1');
                instance.resourceName.should.be.eq('dir2.js-only');

                function _Minimo(){this.value = true};
                const window = {
                    addEventListener: (eventName, fn) => {
                        fn();
                    }
                }
                let jsName;
                M$._onScript = (constructorFn, xInstance, onFinish, v, name) => {
                    instance = new constructorFn(xInstance);
                    jsName = name;
                }
                eval(compiled.globalJs);
                instance.__eval__('param = 2');
                instance.__eval__('param').should.be.eq(2);
                instance.showSomething().should.be.equal('Param: 2');
                instance.resourceName.should.be.eq('dir2.js-only');
                expect(window.jsOnly == instance).to.be.true;
            })));
    });
    it ('Compile page htmx and js with components', () => {
        const realPath = resources.getRealPath('/pages/dir1/with_components.htmx');
        const resInfo = new compiler.Resource('/dir1/with_components', true, true, realPath.substring(0, realPath.lastIndexOf('.')), false);
        return components.startComponents().then(() => 
            Promise.all([resInfo.relativeHtmxPath.map(resources.readResource), resInfo.relativeJsPath.map(resources.readResource)])
                .then(([htmx, js]) => compiler._compilePage(resInfo, util.nullableOption(htmx).optionMap(v => v.data), util.nullableOption(js).optionMap(v => v.data)).then(compiled => {
                    let instance;
                    const M$ = {
                        register: (html, name, constructorFn) => {
                            htmlStruct = html;
                            resourceName = name;
                            instance = new constructorFn({});
                        }
                    };
                    eval(compiled.js);
                    //console.log(compiled.js)
                    expect(compiled.globalJs).to.be.undefined;
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
    it('Reload files', () => compiler._restart()
            .then(compiler._reloadFiles)
            .then(() => [
                    resources.ls(`${context.destinationPath}/dir1`),
                    resources.ls(`${context.destinationPath}/dir2`)
                ].toPromise())
            .then(([dir1, dir2]) => {
                dir1.should.have.lengthOf(3);
                dir1.should.contain(`${context.destinationPath}/dir1/test1.m.js`);
                dir1.should.contain(`${context.destinationPath}/dir1/test1_template_no_js.m.js`);
                dir1.should.contain(`${context.destinationPath}/dir1/with_components.m.js`);
                dir2.should.have.lengthOf(4);
                dir2.should.contain(`${context.destinationPath}/dir2/htmxonly.m.js`);
                dir2.should.contain(`${context.destinationPath}/dir2/js-only.m.js`);
                dir2.should.contain(`${context.destinationPath}/dir2/js-only.js`);
                dir2.should.contain(`${context.destinationPath}/dir2/test_appcache.m.js`);
            }));
    it('Compile Resources', () => components.startComponents()
        .then(compiler.compileResources)
        .then(importableResInfo => {
            _.size(importableResInfo).should.be.eq(6);
        }));
});