class LunoPrototypeMigrator {
  constructor() {

  }

  static convertClassToAssignments(sourceCode = '', targetScope = 'window') {
      if (!sourceCode || typeof sourceCode !== 'string') return sourceCode;

      var acornObj = (typeof window !== 'undefined' && window.acorn) || (typeof globalThis !== 'undefined' && globalThis.acorn);
      if (!acornObj || typeof acornObj.parse !== 'function') return sourceCode;

      let ast = null;
      try {
        ast = acornObj.parse(sourceCode, {
          ecmaVersion: 'latest',
          sourceType: 'module',
          allowReturnOutsideFunction: true,
          allowImportExportEverywhere: true,
          allowHashBang: true,
          ranges: true
        });
      } catch (e) {
        return sourceCode;
      }

      const classNodes = [];
      const walk = (node) => {
        if (!node || typeof node !== 'object') return;
        if (node.type === 'ClassDeclaration' || node.type === 'ClassExpression') {
          classNodes.push(node);
          return;
        }
        for (const k in node) {
          if (k === 'parent') continue;
          const child = node[k];
          if (Array.isArray(child)) {
            for (let i = 0; i < child.length; i++) {
              if (child[i] && typeof child[i].type === 'string') walk(child[i]);
            }
          } else if (child && typeof child.type === 'string') {
            walk(child);
          }
        }
      };
      walk(ast);

      if (classNodes.length === 0) return sourceCode;

      let output = '';

      for (let cIdx = 0; cIdx < classNodes.length; cIdx++) {
        const cls = classNodes[cIdx];
        const className = (cls.id && cls.id.name) ? cls.id.name : 'AppClass';
        const staticFields = [];
        const staticMethods = [];
        const prototypeMethods = [];
        let constructorCode = `function ${className}() {}`;

        if (cls.body && Array.isArray(cls.body.body)) {
          for (let mIdx = 0; mIdx < cls.body.body.length; mIdx++) {
            const member = cls.body.body[mIdx];
            let keyName = null;
            if (member.key) {
              if (member.key.type === 'Identifier') keyName = member.key.name;
              else if (member.key.type === 'PrivateIdentifier') keyName = '#' + member.key.name;
              else if (member.key.type === 'Literal') keyName = String(member.key.value);
            }
            if (!keyName) continue;

            if (member.type === 'PropertyDefinition' || member.type === 'ClassProperty') {
              const initValue = member.value ? sourceCode.slice(member.value.start, member.value.end) : 'undefined';
              if (member.static) {
                staticFields.push(`${className}.${keyName} = ${initValue};`);
              } else {
                prototypeMethods.push(`${className}.prototype.${keyName} = ${initValue};`);
              }
            } else if (member.type === 'MethodDefinition') {
              const methodBody = sourceCode.slice(member.value.start, member.value.end);
              const asyncPrefix = (member.value && member.value.async) ? 'async ' : '';

              if (member.kind === 'constructor') {
                constructorCode = `function ${className}${methodBody.slice(methodBody.indexOf('('))}`;
              } else if (member.static) {
                staticMethods.push(`${className}.${keyName} = ${asyncPrefix}function${methodBody.slice(methodBody.indexOf('('))};`);
              } else {
                prototypeMethods.push(`${className}.prototype.${keyName} = ${asyncPrefix}function${methodBody.slice(methodBody.indexOf('('))};`);
              }
            }
          }
        }

        output += constructorCode + '\n\n';
        if (staticFields.length > 0) output += staticFields.join('\n\n') + '\n\n';
        if (staticMethods.length > 0) output += staticMethods.join('\n\n') + '\n\n';
        if (prototypeMethods.length > 0) output += prototypeMethods.join('\n\n') + '\n\n';
        output += `if (typeof ${targetScope} !== 'undefined') ${targetScope}.${className} = ${className};\n` +
          `if (typeof module !== 'undefined' && module.exports) module.exports = ${className};\n\n`;
      }

      return output.trim();
  }
}

globalThis.LunoPrototypeMigrator = LunoPrototypeMigrator;
if (typeof module !== "undefined" && module.exports) module.exports = LunoPrototypeMigrator;