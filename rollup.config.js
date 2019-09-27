import * as globby from 'globby';
import * as path from 'path';
import * as fs from 'fs';

import commonjs from 'rollup-plugin-commonjs';
import nodeResolve from 'rollup-plugin-node-resolve';
import buble from 'rollup-plugin-buble';
import babel from 'rollup-plugin-babel';

const pkgInfo = require('./package.json');

let external = ['dns', 'fs', 'path', 'url'];
if (pkgInfo.peerDependencies)
  external.push(...Object.keys(pkgInfo.peerDependencies));
if (pkgInfo.dependencies)
  external.push(...Object.keys(pkgInfo.dependencies));

const externalPredicate = new RegExp(`^(${external.join('|')})($|/)`);
const bundlePredicate = /\/themes\//;
const externalTest = id => externalPredicate.test(id) || bundlePredicate.test(id);

const config = {
  onwarn: () => {},
  treeshake: { propertyReadSideEffects: false },
  external: externalTest,
  plugins: [
    nodeResolve({
      mainFields: ['module', 'jsnext', 'main'],
      browser: true,
    }),
    commonjs({
      ignoreGlobal: true,
      include: /\/node_modules\//,
      namedExports: {
        react: Object.keys(require('react')),
      },
    }),
    babel({
      babelrc: false,
      plugins: [
        'babel-plugin-macros',
        '@babel/plugin-transform-flow-strip-types',
        '@babel/plugin-proposal-class-properties'
      ],
    }),
    buble({
      transforms: {
        unicodeRegExp: false,
        dangerousForOf: true,
        dangerousTaggedTemplateString: true,
      },
      objectAssign: 'Object.assign',
      exclude: 'node_modules/**',
    }),
    babel({
      babelrc: false,
      plugins: [
        '@babel/plugin-transform-object-assign',
        ['@babel/plugin-transform-react-jsx', {
          pragma: 'React.createElement',
          pragmaFrag: 'React.Fragment',
          useBuiltIns: true
        }],
      ],
    })
  ]
};

const themes = globby.sync('src/themes/*.js').map(input => {
  const dir = path.dirname(input);
  const name = path.basename(input, '.js');

  if (!fs.existsSync(dir)) fs.mkdirSync(dir);

  const packageJson = {
    name: '@prism-react-renderer/' + name,
    private: true,
    sideEffects: false,
    main: 'index.js',
    module: 'index.es.js',
    license: 'MIT'
  };

  fs.writeFileSync(
    path.join('./themes', name, 'package.json'),
    JSON.stringify(packageJson, undefined, 2)
  );

  return {
    ...config,
    input,
    output: [
      {
        file: path.join('./themes', name, 'index.js'),
        format: 'cjs'
      },
      {
        file: path.join('./themes', name, 'index.es.js'),
        format: 'esm'
      }
    ]
  };
});

export default [
  {
    ...config,
    input: {
      'prism-react-renderer': './src/index.js',
      prism: './src/vendor/prism/index.js',
    },
    output: [
      {
        dir: 'dist',
        entryFileNames: '[name].js',
        chunkFileNames: '[name]-[hash].js',
        format: 'cjs'
      },
      {
        dir: 'dist',
        entryFileNames: '[name].es.js',
        chunkFileNames: '[name]-[hash].es.js',
        format: 'esm'
      }
    ]
  },
  ...themes
];