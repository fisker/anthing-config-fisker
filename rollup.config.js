/* eslint-disable import/no-extraneous-dependencies */

import nodeResolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import json from 'rollup-plugin-json'
import {terser} from 'rollup-plugin-terser'
import pkg from './package.json'

const prettierConfig = {
  ...require('./prettier.config'),
  parser: 'babel',
}

const external = Object.keys(pkg.dependencies).concat(['path', 'fs'])
const plugins = [json(), nodeResolve(), commonjs({}), terser()]
const FORMAT_CJS = 'cjs'

function rollupConfig(config = {}) {
  if (typeof config === 'string') {
    config = {
      entry: config,
    }
  }

  const {entry, dist = config.entry, cli} = config

  return {
    input: `src/${entry}.js`,
    output: {
      file: `lib/${dist}.js`,
      format: FORMAT_CJS,
    },
    plugins,
    external,
  }
}

export default [rollupConfig('cli')]
