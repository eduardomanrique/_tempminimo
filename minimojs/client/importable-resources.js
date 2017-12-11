//this source has information about existing pages (and its templates), and scripts. Also has information about authorization
const resourceInfoMap = "%importableResources%";

//return information about a template of an existing page
const getTplInfo = (path) => {
    let info = resourceInfoMap[path.replace(/\.html$/, '')];
    return info ? info.templateName._val : null;
}

//check if a resource script exists
const isImportable = (path) => resourceInfoMap[path] != null;

module.exports = {
    getTemplateInfo: getTplInfo,
    isImportable: isImportable
}