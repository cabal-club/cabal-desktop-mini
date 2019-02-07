var html = require('choo/html')
var Identicon = require('identicon.js')
const { ipcRenderer } = window.require('electron')

var TITLE = 'Cabal Mini'

// Get initial state
ipcRenderer.sendSync('cabal-get-state')

module.exports = function (state, emit) {
  if (state.title !== TITLE) emit(state.events.DOMTITLECHANGE, TITLE)

  state.cabalState.cabals = state.cabalState.cabals || {}

  console.log(state)

  return html`
    <body class="sans-serif">
      <nav class="ph4 pt4">
        <a style="opacity: 0" class="f6 link br3 ph3 pv2 mb1 dib white bg-black" href="/">Cabal</a>
      </nav>
      <h1 class="ph4 f3 f2-m f1-l">${TITLE}</h1>

      <div class="pa4">
        ${Object.entries(state.cabalState.cabals).map((cabal) => {
          var alias = cabal[0]
          var key = cabal[1]
          if (alias === key) {
            alias = key.substr(0, 6)
          }
          console.log(key)
          var identicon = new Identicon(key, {
            saturation: 1,
            brightness: 0.15,
            margin: 0,
            background: [255, 255, 255, 255]
          }).toString()
          return html`
            <a class="dt w-100 b--black-05 pb3 mt2" onclick=${function () { loadCabal(key) }}">
              <div href="#" class="dtc v-mid" style="width: 2.5rem">
                <img src="data:image/png;base64,${identicon}" class="db br2 w2"/>
              </div>
              <div href="#" class="dtc v-mid pl1">
                <h1 class="f6 ttu tracked mt0">${alias}</h1>
              </div>
            </a>
          `
        })}
        <div>
          <label for="key" class="f6 b db mb2">Join a Cabal</label>
          <input placeholder="cabal://" id="joinKeyInput" class="input-reset ba b--black-20 pa2 mb2 db w-100" type="text" aria-describedby="name-desc">
          <small id="name-desc" class="f6 black-60 db mb2"></small>
          <a class="f6 link dim br3 ph3 pv2 mb1 dib white bg-black" href="#" onclick=${joinCabal}>Join</a>
        </div>
        <a class="f6 link br3 ph3 pv2 mb1 dib white bg-black" href="#" onclick=${createCabal}>Create a New Cabal</a>
      </div>
    </body>
  `

  function createCabal () {
    loadCabal()
  }

  function joinCabal () {
    var key = document.getElementById('joinKeyInput').value
    loadCabal(key)
  }

  function loadCabal (key) {
    ipcRenderer.sendSync('cabal-load-cabal', { key })
    window.location = '/messenger'
  }
}
