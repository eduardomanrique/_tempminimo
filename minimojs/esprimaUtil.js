const esprima = require('esprima');

const arrayExpression = (v, ident) => v.elements.map(e => expression(e, ident)).join(", ");

const parametersCall = (v, ident) => v.map(e => expression(v[i], ident)).join(', ');

const parametersDeclaration = (v, ident) => `(${v.map(e => e.name).join(', ')})`;

const property = (v, ident, call) => {
  if (call) {
    call.push(v.name);
  }
  return v.type == 'Identifier' ? v.name : v.type == 'MemberExpression' ? memberExpression(v, ident, call) : v.raw;
}

const memberExpression = (v, ident, call) => {
  let s = '';
  if (v.object.type == "ThisExpression") {
    s += 'this';
  } else if (v.object.type == "Identifier") {
    if (call) {
      call.push(v.object.name);
    }
    s += v.object.name;
  } else if (v.object.type == "MemberExpression") {
    s += memberExpression(v.object, ident, call);
  } else {
    s += callExpression(v.object, ident, call);
  }
  let p = property(v.property, ident, call);
  return s + (v.computed ? `[${p}]` : `.${p}`);
}

const functionDeclaration = (v, ident, makeVarDeclaration) => {
  let body = iterate(v.body, ident + '  ');
  let varDecl = (makeVarDeclaration ? `var ${v.id.name} = ` : '');
  let fnName = (v.id ? v.id.name : '');
  let paramDecl = parametersDeclaration(v.params, ident);
  return `
    ${varDecl}X.$(function ${fnName}${paramDecl}{
      ${body}${ident}
    };
  `;
}

const objectExpression = (v, ident) => `
    {
      ${v.properties.map(p => vIdent(ident) + (p.key.name || p.key.raw) + ':' + expression(p.value, vIdent)).join(',\n')}
    }
  `;

const vIdent = (ident) => ident || '  ';

const unaryExpression = (v, ident) => `${v.operator} ${expression(v.argument)}`;

const conditionalExpression = (v, ident) => `(${expression(v.test)} ? ${expression(v.consequent)} : ${expression(v.alternate)})`;

const assignmentExpression = (v, binary, ident) =>
  `${(binary ? '(' : '')}${expression(v.left, ident)}${(binary ? ')' : '')} ${v.operator} ${(binary ? '(' : '')} ${expression(v.right, ident)}${(binary ? ')' : '')}`;

const callExpression = (v, ident, otherCall) => {
  let call = [];
  let s = '';
  if (v.callee.type == "Identifier") {
    call.push(v.callee.name);
    s = v.callee.name;
  } else if (v.callee.type == "MemberExpression") {
    s = memberExpression(v.callee, ident, call);
  } else if (v.callee.type == "FunctionExpression") {
    s = functionDeclaration(v.callee, ident);
  } else if (v.callee.type == "CallExpression") {
    s = callExpression(v.callee, ident, call);
  }
  let appendMeta = false;
  append_xmeta.some(item => {
    if (item.length == call.length) {
      let found = true;
      for (let i = 0; i < call.length; i++) {
        if (call[i] != item[i]) {
          found = false;
          break;
        }
      }
      if (found) {
        appendMeta = true;
        return true;
      }
    }
  });
  if (otherCall) {
    call.forEach(item => otherCall.push(item));
  }
  return `s(${parametersCall(v.arguments, ident)}${(appendMeta ? (v.arguments.length > 0 ? ', ' : '') : '')})`;
}

const expression = (v, ident) => {
  if (v.type == "Identifier") {
    return v.name;
  } else if (v.type == "Literal") {
    return v.raw;
  } else if (v.type == "CallExpression") {
    return callExpression(v, ident);
  } else if (v.type == "FunctionExpression") {
    return functionDeclaration(v, ident);
  } else if (v.type == "AssignmentExpression") {
    return assignmentExpression(v, false, ident);
  } else if (v.type == "MemberExpression") {
    return memberExpression(v, ident);
  } else if (v.type == "ArrayExpression") {
    return arrayExpression(v, ident);
  } else if (v.type == "BinaryExpression" || v.type == "LogicalExpression") {
    return assignmentExpression(v, true, ident);
  } else if (v.type == "NewExpression") {
    return `new ${callExpression(v, ident)}`;
  } else if (v.type == "UpdateExpression") {
    return v.argument.name + v.operator;
  } else if (v.type == "ObjectExpression") {
    return objectExpression(v, ident);
  } else if (v.type == "UnaryExpression") {
    return unaryExpression(v, ident);
  } else if (v.type == "ConditionalExpression") {
    return conditionalExpression(v, ident);
  }
}

const declarations = (d, ident) => `var ${d.map(di => di.id.name + (di.init ? " = " + expression(di.init, ident) : "")).join(", ")}`;

const ifStatement = (v, ident) => {
  let ifst = [`if(${expression(v.test, ident)})${processItem(v.consequent, ident + '  ')}`];
  if (v.alternate) {
    ifst.push('else');
    if (v.alternate.type == 'IfStatement') {
      ifst.push(ifStatement(v.alternate, ident));
    } else {
      ifst.push(processItem(v.alternate, ident + '  '));
    }
  }
  return ifst.join('');
}

const tryStatement = (v, ident) => {
  let tryst = ['try'];
  tryst.push(processItem(v.block, ident + '  '));
  if (v.handlers && v.handlers.length > 0) {
    tryst.push(`catch(${v.handlers[0].param.name})`);
    tryst.push(processItem(v.handlers[0].body, ident + '  '));
  }
  if (v.finalizer) {
    tryst.push('finally');
    tryst.push(processItem(v.finalizer.body, ident + '  '));
  }
  return tryst.join('');
}

const switchStatement = (v, ident) => {
  let vIdent = ident + '  ';
  let switchst = [`switch(${expression(v.discriminant, ident)}){`];
  v.cases.forEach(c => {
    switchst.push(ident + (c.test ? `case ${expression(c.test, ident)}` : 'default') + ':');
    c.consequent.forEach(conseq => switchst.push(vIdent + processItem(c.consequent[j], ident)));
  });
  return `${switchst.join('\n')}${ident}}`;
}

const whileStatement = (v, ident) => `while(${expression(v.test, ident)})${processItem(v.body, ident + '  ')}`;

const doWhileStatement = (v, ident) => `do${processItem(v.body, ident + '  ')}while(${expression(v.test, ident)});`;

const forInStatement = (v, ident) => `for(${(v.left.type == 'VariableDeclaration' ? 'var ' + v.left.declarations[0].id.name : v.left.name)} in ${expression(v.right)})${processItem(v.body, ident + '  ')}`;

const varOrExpr = (v, ident) => {
  if (v.type == "VariableDeclaration") {
    return declarations(v.declarations, ident);
  } else {
    return expression(v, ident);
  }
}

const forStatement = (v, ident) => `for(${(v.init ? varOrExpr(v.init) : '')} ; ${(v.test ? expression(v.test) : '')}; ${(v.update ? varOrExpr(v.update) : '')})${processItem(v.body, ident + '  ')}`;

const processItem = (item, ident) => {
  if (item.type == "VariableDeclaration") {
    return `${ident}${declarations(item.declarations, ident)};`;
  } else if (item.type == "FunctionDeclaration") {
    return `${ident}${functionDeclaration(item, ident, true)}`;
  } else if (item.type == "ExpressionStatement") {
    return `${ident}${expression(item.expression, ident)};`;
  } else if (item.type == "ReturnStatement") {;
    return `${ident}return ${(item.argument ? ' ' + expression(item.argument, ident) : '')};`;
  } else if (item.type == "IfStatement") {
    return `${ident}${ifStatement(item, ident)}`;
  } else if (item.type == "WhileStatement") {
    return `${ident}${whileStatement(item, ident)}`;
  } else if (item.type == "ForInStatement") {
    return `${ident}${forInStatement(item, ident)}`;
  } else if (item.type == "ForStatement") {
    return `${ident}${forStatement(item, ident)}`;
  } else if (item.type == "DoWhileStatement") {
    return `${ident}${doWhileStatement(item, ident)}`;
  } else if (item.type == "LabeledStatement") {
    return `${ident}${item.label.name}: ${processItem(item.body, ident)}`;
  } else if (item.type == "BlockStatement") {
    return `{
      ${iterate(item, ident + ' ')}
    ${ident}}`;
  } else if (item.type == "BreakStatement") {
    return `${ident}break${(item.label ? ' ' + item.label.name : '')};`;
  } else if (item.type == "ContinueStatement") {
    return `${ident}continue${(item.label ? ' ' + item.label.name : '')};`;
  } else if (item.type == "EmptyStatement") {
    return '';
  } else if (item.type == "SwitchStatement") {
    return `${ident}${switchStatement(item, ident)}`;
  } else if (item.type == "TryStatement") {
    return `${ident}${tryStatement(item, ident)}`;
  }
}

const iterate = (parsed, ident) => parsed.body.map(item => processItem(item, ident || '')).join('\n');

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
