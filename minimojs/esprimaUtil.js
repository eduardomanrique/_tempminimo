module.exports = {
  getFirstLevelFunctions: (parsed) => {
    let scr = [];
    parsed.body.forEach(item => {
      if (item.type == "FunctionDeclaration") {
        if (!item.id.name.startsWith('_')) {
          scr.push(item.id.name);
        }
      } else if (item.type == "VariableDeclaration") {
        item.declarations.forEach(d => {
          if (d.init && d.init.type == "FunctionExpression") {
            if (d.id && !d.id.name.startsWith('_')) {
              scr.push(d.id.name);
            }
          }
        })
      }
    });
    return scr;
  },
  getFirstLevelVariables: (parsed) => {
    let src = [];
    parsed.body.forEach(item => {
      if (item.type == "VariableDeclaration") {
        item.declarations.forEach(d => {
          if (!d.init || d.init.type != "FunctionExpression") {
            if (d.id && !d.id.name.startsWith('_')) {
              src.push(d.id.name);
            }
          }
        });
      }
    });
    return src;
  }
}
