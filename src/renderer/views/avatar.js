var html = require('choo/html')
var Identicon = require('identicon.js')

module.exports = function (key, style) {
  if (!key) return ''
  if (!style) style = {}
  var identicon = new Identicon(key, {
    saturation: style.saturation || 1,
    brightness: style.brightness || 0.15,
    margin: style.margin || 0,
    background: style.background || [255, 255, 255, 255]
  }).toString()
  return html`<img src="data:image/png;base64,${identicon}" class="${style.className || 'db br2 w2'}"/>`
}
