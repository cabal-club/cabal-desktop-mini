var choo = require('choo')
var css = require('sheetify')
var { ipcRenderer } = window.require('electron')

css('tachyons')

var cabalPorcelain = function (state, emitter) {
  state.cabalState = {}

  ipcRenderer.on('cabal-state-update', (event, cabalState) => {
    console.log({ cabalState })
    state.cabalState = cabalState
    emitter.emit('render')
  })
  ipcRenderer.on('cabal-messages-update', (event, data) => {
    console.log({ data })
    // state.cabalState = cabalState
    emitter.emit('render')
  })
}

var app = choo()
if (process.env.NODE_ENV !== 'production') {
  app.use(require('choo-devtools')())
}

app.use(cabalPorcelain)

app.route('/', require('./views/cabals'))
app.route('/join', require('./views/join'))
app.route('/messenger', require('./views/messenger'))
app.route('/peers', require('./views/peers'))
app.route('/settings', require('./views/settings'))
app.route('/*', require('./views/404'))

if (!module.parent) app.mount('body')
else module.exports = app
