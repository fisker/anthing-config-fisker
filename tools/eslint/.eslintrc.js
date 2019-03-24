/*!
 * config file for `eslint`
 *
 * update: wget -O .eslintrc.js https://git.io/fhNxh
 * document: https://eslint.org/docs/user-guide/configuring
 */

/* @xwtec/eslint-config https://git.io/fhNpT */
const xwtec = (pkg => ({
  default: pkg,
  legacy: `${pkg}/legacy`,
  vue: `${pkg}/vue`,
}))('@xwtec/eslint-config')

module.exports = {
  root: true,
  parserOptions: {},
  extends: [xwtec.default],
  settings: {},
  rules: {},
  plugins: [],
  overrides: [],
}
