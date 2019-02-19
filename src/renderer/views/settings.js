var html = require('choo/html')
const { ipcRenderer } = window.require('electron')

var TITLE = 'Settings'

module.exports = function (state, emit) {
  if (state.title !== TITLE) emit(state.events.DOMTITLECHANGE, TITLE)

  state.cabalState = state.cabalState || {}
  state.cabalState.currentUser = state.cabalState.user || { key: '' }
  var currentUserName = state.cabalState.currentUser.name || state.cabalState.currentUser.key.substr(0, 6)

  return html`
    <body class="sans-serif">
      <nav class="ph4 pt4">
        <a class="f6 link br3 ph3 pv2 mb1 dib black dim ba b--black" href="/messenger">⬅</a>
      </nav>
      <h1 class="ph4 f3 f2-m f1-l">${TITLE}</h1>
      <div class="pa4 black-80">
          <label for="name" class="f6 b db mb2">Nickname</label>
          <input value="${currentUserName}" id="nickInput" class="input-reset ba b--black-50 bw2 br3 pa2 mb3 db w-100" type="text" aria-describedby="name-desc">
          <small id="name-desc" class="f6 black-60 db mb2"></small>
          <a class="f6 link dim br3 ph3 pv2 mb1 dib white bg-black pointer" onclick=${save}>Save</a>
      </div>
    </body>
  `

  function save () {
    var nick = document.getElementById('nickInput').value
    ipcRenderer.sendSync('cabal-publish-nick', { nick })
  }
}
