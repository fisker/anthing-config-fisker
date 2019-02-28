#!/usr/bin/env node

'use strict'

function _interopDefault(ex) {
  return ex && typeof ex === 'object' && 'default' in ex ? ex['default'] : ex
}

var writePkg = _interopDefault(require('write-pkg'))
var execa = _interopDefault(require('execa'))
var hasYarn = _interopDefault(require('has-yarn'))
var inquirer = _interopDefault(require('inquirer'))
var chalk = _interopDefault(require('chalk'))
var readPkg = require('read-pkg')
var fs = require('fs')
var path = require('path')
var cpFile = _interopDefault(require('cp-file'))
var latestVersion = _interopDefault(require('latest-version'))

var pkg = readPkg.sync({normalize: false})

const {hasOwnProperty} = Object.prototype

const dependencies = {
  ...pkg.dependencies,
  ...pkg.devDependencies,
}
function isDependencyAdded(dependency) {
  return hasOwnProperty.call(dependencies, dependency)
}

function isToolInstalled(tool) {
  const {files, dependencies, pkg: json} = tool

  if (files.some(({target}) => fs.existsSync(target))) {
    return 'maybe'
  }

  if (dependencies.some(isDependencyAdded)) {
    return 'maybe'
  }

  if (Object.keys(json).some(key => hasOwnProperty.call(pkg, key))) {
    return 'maybe'
  }

  return false
}

const TOOLS_DIR = path.join(__dirname, '../tools/')
const CWD = process.cwd()

function loadToolConfig(dirName) {
  const config = require(path.join(TOOLS_DIR, dirName))

  config.installByDefault = config.installByDefault !== false

  const {files = [], dependencies = [], pkg: json = {}} = config

  config.files = files.map(file => {
    const dir = path.join(TOOLS_DIR, dirName)
    const source = path.join(dir, file)
    const target = path.join(CWD, file)
    const path$1 = path.relative(dir, source)

    return {
      path: path$1,
      dir,
      source,
      target,
    }
  })

  config.dependencies = dependencies
  config.pkg = json

  return {
    name: dirName,
    ...config,
    isInstalled: isToolInstalled(config),
  }
}

const dirs = fs.readdirSync(TOOLS_DIR)
const tools = dirs.sort().map(loadToolConfig)

async function copyFiles(files) {
  await Promise.all(files.map(({source, target}) => cpFile(source, target)))
}

function uniq(arr) {
  return [...new Set(arr)]
}

async function parseDependencies(dependencies) {
  dependencies = uniq(dependencies)

  const promises = dependencies.map(dependency =>
    latestVersion(dependency).then(version => `^${version}`, () => 'latest')
  )

  const versions = await Promise.all(promises)

  return dependencies.reduce(
    (all, dependency, index) =>
      Object.assign(all, {[dependency]: versions[index]}),
    {}
  )
}

/* eslint-disable no-console */

const HAS_YARN = hasYarn()
const NPM_CLIENT = HAS_YARN ? 'yarn' : 'npm'

run()

async function merge(tools) {
  const files = tools.reduce((all, {files = []}) => [...all, ...files], [])

  const dependencies = await parseDependencies(
    tools
      .reduce((all, {dependencies = []}) => all.concat(dependencies), [])
      .filter(dependency => !isDependencyAdded(dependency))
      .sort()
  )

  const json = tools.reduce(
    (all, {package: pkg = {}}) => Object.assign(all, pkg),
    {}
  )

  return {
    files,
    dependencies,
    json,
  }
}

async function setup(tools) {
  const {files, dependencies, json} = await merge(tools)
  const newDependencies = Object.keys(dependencies).length !== 0
  const newFiles = files.length !== 0

  await copyFiles(files)

  pkg.devDependencies = Object.assign(dependencies, pkg.devDependencies)
  Object.assign(pkg, json)

  // eslint-disable-next-line no-underscore-dangle
  delete pkg._id

  await writePkg(pkg)

  return {
    newFiles,
    newDependencies,
  }
}

async function selectTools() {
  const choices = tools.map(
    ({name, installByDefault, isInstalled}, index, {length}) => {
      const checked = installByDefault && !isInstalled
      const maxIndexLength = String(length).length + 1

      const display = [
        chalk.gray(`${index + 1}.`.padStart(maxIndexLength)),
        isInstalled ? chalk.red('[installed]') : '',
        chalk.bold(name),
        installByDefault ? '' : chalk.gray('* not install by default *'),
      ]
        .filter(Boolean)
        .join(' ')

      return {
        name: display,
        value: name,
        short: name,
        checked,
      }
    }
  )

  const {selected} = await inquirer.prompt({
    type: 'checkbox',
    name: 'selected',
    message: 'select config(s) you want install:',
    choices,
    pageSize: Math.min(choices.length, 15),
  })

  if (selected.length === 0) {
    return []
  }

  const {confirmed} = await inquirer.prompt({
    type: 'confirm',
    name: 'confirmed',
    message: `install ${selected.length} selected config(s): ${selected.join(
      ','
    )}?`,
    default: true,
  })

  if (!confirmed) {
    const selected = await selectTools()
    return selected
  }

  return tools.filter(({name}) => selected.includes(name))
}

async function installPackages() {
  const {confirmed} = await inquirer.prompt({
    type: 'confirm',
    name: 'confirmed',
    message: `run ${NPM_CLIENT} to install?`,
    default: true,
  })

  if (!confirmed) {
    return
  }

  const args = NPM_CLIENT === 'yarn' ? [] : ['install']
  await execa(NPM_CLIENT, args).stdout.pipe(process.stdout)
}

async function run() {
  const selectedTools = await selectTools()

  if (selectedTools.length === 0) {
    console.log('nothing to install.')
    return
  }

  const {newDependencies} = await setup(selectedTools)

  if (newDependencies) {
    await installPackages()
  }
}

var cli = {run}

module.exports = cli
