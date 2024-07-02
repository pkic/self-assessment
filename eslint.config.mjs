import typescriptEslint from '@typescript-eslint/eslint-plugin';
import github from 'eslint-plugin-github';
import typescriptParser from '@typescript-eslint/parser';
import path from 'path';

export default [
    {
        ignores: ["dist/"],
    },
    {
        files: ["**/*.ts", "**/*.tsx"],
        plugins: {
            '@typescript-eslint': typescriptEslint,
            github,
        },
        languageOptions: {
            parser: typescriptParser,
            ecmaVersion: 2020,
            sourceType: 'module',
            parserOptions: {
                project: path.resolve('./tsconfig.json'),
            },
            globals: {
                es2020: true,
            }
        },
        rules: {
            semi: "error",
            "prefer-const": "error"
        },
    }
];
