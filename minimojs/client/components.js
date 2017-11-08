
function createComponentContext(jsonInfo, minimoInstance){
    //must recreate function from string to create it on the right context
    const m = minimoInstance;
    const components = '%components%';
    const component = components[jsonInfo.cn];
    return m.eval(`var __types = '%component-types%';
        '%__setUpGetterForAttributes%';
        var __temp_var = ${component.htmxContext.toString()};
        new __temp_var(${JSON.stringify(jsonInfo.ip)}, __types);`);
}
