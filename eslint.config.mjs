import js from '@eslint/js';
import globals from 'globals';

const jsxNames = { meta: { type: 'problem', schema: [], messages: { missing: 'El componente {{name}} no está definido ni importado.' } },
  create(context) { return { JSXOpeningElement(node) {
    let name = node.name;
    while (name.type === 'JSXMemberExpression') name = name.object;
    if (name.type !== 'JSXIdentifier' || !/^[A-Z]/.test(name.name)) return;
    let scope = context.sourceCode.getScope(node);
    while (scope) { if (scope.set.has(name.name)) return; scope = scope.upper; }
    context.report({ node: name, messageId: 'missing', data: { name: name.name } });
  } }; }
};
export default [
  { ignores: ['dist/**', 'dist_installer/**', 'node_modules/**', 'work/**'] },
  { ...js.configs.recommended, files: ['src/**/*.{js,jsx}', 'shared/**/*.mjs', 'electron/**/*.{js,cjs,mjs}'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.browser, ...globals.node }, parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { local: { rules: { 'jsx-defined': jsxNames } } },
    rules: { ...js.configs.recommended.rules, 'no-unused-vars': 'off', 'local/jsx-defined': 'error' }
  }
];
