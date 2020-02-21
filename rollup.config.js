import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import builtins from 'rollup-plugin-node-builtins'
import globals from 'rollup-plugin-node-globals'

export default {
  input: './src/index.js',
  output: {
    dir: 'dist',
    // format: 'iife',
    // format: 'iife'
  },
  watch: {
    include: './*.js'
  },
  plugins: [resolve({
    browser: true,
    preferBuiltins: true
  }),
  commonjs(),
  json(),
  globals(),
  builtins(),
    // babel()
  ],
}
