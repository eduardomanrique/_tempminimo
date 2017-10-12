
function defineAttributes(types){
  return {
    "id": types.mandatory.string,
    "column": {
      "title": types.string.defaultValue('None'),
      "content": types.mandatory.html
    },
    "list": types.boundVariable,
    "v": types.bind
  }
}

function remove(indexToRemove){
    this.list.splice(indexToRemove, 1);
}