var fs = require('fs')
var path = require('path')
const { execSync } = require('child_process')

var version = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8')).version

var assets = [
  `dist/cabal-desktop-mini-${version}-mac.dmg`,
  `dist/cabal-desktop-mini-${version}-windows.exe`,
  `dist/cabal-desktop-mini_${version}_amd64.snap`,
  `dist/cabal-desktop-mini-${version}-linux-x86_64.AppImage`
]

console.log('>>> Run this:')
console.log(`gh-release --draft --assets ${assets.join(',')}`)
