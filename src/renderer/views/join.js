var html = require('choo/html')
const { ipcRenderer } = window.require('electron')

var TITLE = 'Join A Cabal'

module.exports = function (state, emit) {
  if (state.title !== TITLE) emit(state.events.DOMTITLECHANGE, TITLE)

  return html`
    <body class="sans-serif">
      <nav class="ph4 pt4">
        <a class="f6 link br3 ph3 pv2 mb1 dib black dim ba b--black" onclick=${() => navigate('/cabals')}>⬅</a>
      </nav>
      <h1 class="ph4 f3 f2-m f1-l">${TITLE}</h1>
      <form class="pa4 black-80">
        <label for="key" class="f6 b db mb2">Cabal Key</label>
        <input placeholder="cabal://" id="joinKeyInput" class="input-reset ba b--black-50 bw2 br3 pa2 mb3 db w-100" type="text" aria-describedby="key-desc">
        <small id="key-desc" class="f6 black-60 db mb2"></small>
        <a class="f6 link dim br3 ph3 pv2 mb1 dib white bg-black pointer" onclick=${joinCabal}>Join</a>
      </form>
    </body>
  `

  function joinCabal () {
    var key = document.getElementById('joinKeyInput').value
    loadCabal(key)
  }

  function loadCabal (key) {
    ipcRenderer.sendSync('cabal-load-cabal', { key })
    window.location.hash = 'messenger'
  }

  function navigate (location) {
    emit(state.events.PUSHSTATE, location)
  }
}
