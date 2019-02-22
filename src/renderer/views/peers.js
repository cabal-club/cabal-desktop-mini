var html = require('choo/html')
const { ipcRenderer } = window.require('electron')

var avatar = require('./avatar')

var TITLE = 'Peers'

module.exports = function (state, emit) {
  if (state.title !== TITLE) emit(state.events.DOMTITLECHANGE, TITLE)

  state.cabalState = state.cabalState || {}
  state.cabalState.currentUser = state.cabalState.user || { key: '' }
  state.cabalState.users = state.cabalState.users || {}

  var users = Object.values(state.cabalState.users)

  users = users.sort(function (a, b) {
    return (!!a.online === !!b.online) ? 0 : a.online ? -1 : 1
  })
  return html`
    <body class="sans-serif">
      <nav class="ph4 pt4">
        <a class="f6 link br3 ph3 pv2 mb1 dib black dim ba b--black" href="#messenger">⬅</a>
      </nav>
      <h1 class="ph4 f3 f2-m f1-l">${TITLE}</h1>

      <div class="pa4">
        ${users.map((user) => {
          return html`
            <article class="dt w-100 b--black-05 pb3 mt2">
              <div class="dtc v-top" style="width: 2.5rem">
                ${user.online ? '➤' : ''}
              </div>
              <div class="dtc v-top w1 pr1">
                ${avatar(user.key, { className: 'w1' })}
              </div>
              <div class="dtc v-mid pl1">
                <h1 class="f6 ttu tracked mt0">${user.name}</h1>
              </div>
            </article>
          `
        })}
      </div>
    </body>
  `
}
