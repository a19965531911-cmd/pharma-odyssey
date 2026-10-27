import js from '@eslint/js';
import globals from 'globals';
export default [{ignores:['src/**/*.ts']},js.configs.recommended,{files:['src/**/*.js'],languageOptions:{globals:{...globals.browser,COURSE:'readonly'}},rules:{'no-unused-vars':['error',{argsIgnorePattern:'^_',varsIgnorePattern:'^_'}],'no-empty':['error',{allowEmptyCatch:true}],'no-constant-binary-expression':'off'}}];
