import exists from './is-exists'

function isInstalled({packageJson, files, dependencies}) {
  return (
    packageJson.some(exists) || files.some(exists) || dependencies.some(exists)
  )
}

export default isInstalled
