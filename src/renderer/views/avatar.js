var html = require('choo/html')
var Identicon = require('identicon.js')

module.exports = function (key, style) {
  var identicon = new Identicon(key, {
    saturation: 1,
    brightness: 0.15,
    margin: 0,
    background: [255, 255, 255, 255]
  }).toString()
  return html`<img src="data:image/png;base64,${identicon}" class="${style.className || 'db br2 w2'}"/>`
}
