var html = require('choo/html')
const { ipcRenderer } = window.require('electron')

var TITLE = 'Settings'

module.exports = function (state, emit) {
  if (state.title !== TITLE) emit(state.events.DOMTITLECHANGE, TITLE)

  console.log('settings...')
  state.cabalState = state.cabalState || {}
  state.cabalState.currentUser = state.cabalState.user || { key: '' }
  var currentUserName = state.cabalState.currentUser.name || state.cabalState.currentUser.key.substr(0, 6)
  // <svg class="w1" data-icon="chevronLeft" viewBox="0 0 32 32" style="fill:currentcolor">
  //         <title>chevronLeft icon</title>
  //         <path d="M20 1 L24 5 L14 16 L24 27 L20 31 L6 16 z"></path>
  //       </svg>

  return html`
    <body class="sans-serif">
      <nav class="ph4 pt4">
        <a class="f6 link dim br3 ph3 pv2 mb1 dib white bg-black" href="/">⬅ Back</a>
      </nav>
      <h1 class="ph4 f3 f2-m f1-l">${TITLE}</h1>
      <form class="pa4 black-80">
        <div class="measure">
          <label for="name" class="f6 b db mb2">Name</label>
          <input value="${currentUserName}" id="nickInput" class="input-reset ba b--black-20 pa2 mb2 db w-100" type="text" aria-describedby="name-desc">
          <small id="name-desc" class="f6 black-60 db mb2"></small>
          <a class="f6 link dim br3 ph3 pv2 mb1 dib white bg-black" href="#" onclick=${save}>Save</a>
        </div>
      </form>
    </body>
  `

  function save () {
    var nick = document.getElementById('nickInput').value
    ipcRenderer.sendSync('cabal-publish-nick', nick)
  }
}
