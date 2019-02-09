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
      <h1 class="ph4 f3 f2-m f1-l">
        ${TITLE}
        <a onclick=${createCabal} href="#" class="hover-dark-pink link black-50 b f6 f5-ns dib mh3 ttu" title="Create a new Cabal">NEW</a>
        <a href="/join" class="hover-dark-pink link black-50 b f6 f5-ns dib mr3 ttu" title="Join a Cabal">JOIN</a>
      </h1>

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
            <a style="cursor: pointer" class="flex w-100 b--black-05 pb3 mt2" onclick=${function () { loadCabal(key) }}">
              <div class=" v-mid" style="width: 2.5rem">
                <img src="data:image/png;base64,${identicon}" class="db br2 w2"/>
              </div>
              <div class="dtc v-mid pl1">
                <h1 class="f4 ttu tracked mt1 link black hover-dark-pink">${alias}</h1>
              </div>
            </a>
          `
        })}
      </div>
    </body>
  `

  function createCabal () {
    loadCabal()
  }

  function loadCabal (key) {
    ipcRenderer.sendSync('cabal-load-cabal', { key })
    window.location = '/messenger'
  }
}
