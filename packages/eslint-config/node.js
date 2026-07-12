import baseConfig from './base.js';
import tseslint from 'typescript-eslint';

/** @type {import("eslint").Linter.Config[]} */
export default [...baseConfig, ...tseslint.configs.recommended];
