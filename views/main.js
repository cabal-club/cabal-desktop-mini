var html = require('choo/html')
var Identicon = require('identicon.js')
const { ipcRenderer } = window.require('electron')

var TITLE = 'Cabal Mini'

module.exports = function (state, emit) {
  if (state.title !== TITLE) emit(state.events.DOMTITLECHANGE, TITLE)
  state.cabalState.key = state.cabalState.key || ''
  state.cabalState.channel = state.cabalState.channel || 'default'
  state.cabalState.channels = state.cabalState.channels || []
  state.cabalState.messages = state.cabalState.messages || []
  state.cabalState.currentUser = state.cabalState.user || { key: '' }
  state.cabalState.users = state.cabalState.users || {}

  var keyShort = state.cabalState.key.substr(0, 6)
  var currentUserName = state.cabalState.currentUser.name || state.cabalState.currentUser.key.substr(0, 6)

  return html`
    <body class="sans-serif">
      <nav class="ph4 pt4">
        <a style="opacity: 0" class="f6 link br3 ph3 pv2 mb1 dib white bg-black" href="/">Cabal</a>
      </nav>
      <h1 class="ph4 f3 f2-m f1-l">
        ${TITLE}
        <a href="/settings" class="hover-dark-pink link black-50 b f6 f5-ns dib mh3 ttu" title="${state.cabalState.currentUser.key}">${currentUserName}</a>
        <a href="/peers" class="hover-dark-pink link black-50 b f6 f5-ns dib mr3 ttu" title="Peers">PEERS</a>
      </h1>

      <nav class="ph4 w-100 pv3 bt bb b--black-10 overflow-auto">
        <a class="hover-dark-pink link black b f6 f5-ns dib mr3 ttu" title="${keyShort}">${keyShort}</a>
        ${state.cabalState.channels.map((channel) => {
          return html`<a class="hover-dark-pink link gray f6 f5-ns dib mr3 ttu" href="#" title="${channel}" onclick=${function () { loadChannel(channel) }}>${channel}</a>`
        })}
      </nav>

      <article class="pa4">
        <input placeholder="Message #${state.cabalState.channel}" id="messageInput" onkeyup=${onMessageInputKeypress} class="input-reset ba b--black-50 bw2 br3 pa2 mb3 db w-100" type="text" aria-describedby="name-desc">
        ${state.cabalState.messages.map((message) => {
          var name = keyToUsername(message.key)
          var text = message.value.content.text
          var identicon = new Identicon(message.key, {
            saturation: 1,
            brightness: 0.15,
            margin: 0,
            background: [255, 255, 255, 255]
          }).toString()
          return html`
            <article class="dt w-100 b--black-05 pb3 mt2">
              <div class="dtc v-top" style="width: 2.5rem">
                <img src="data:image/png;base64,${identicon}" class="db br2 w2"/>
              </div>
              <div class="dtc v-mid pl1">
                <h1 class="f6 ttu tracked mt0">${name}</h1>
                <p class="f6 fw5 mt0 mb0 black-80">${text}</p>
              </div>
            </article>
          `
        })}
      </article>
    </body>
  `

  function onMessageInputKeypress (event) {
    event.preventDefault();
    if (event.keyCode === 13) {
      sendMessage()
    }
  }

  function sendMessage () {
    var message = document.getElementById('messageInput').value
    ipcRenderer.sendSync('cabal-publish-message', {
      message,
      channel: state.cabalState.channel
    })
  }

  function loadChannel (channel) {
    ipcRenderer.sendSync('cabal-load-channel', {
      channel: channel
    })
  }

  function keyToUsername (key) {
    key = key || ''
    var users = state.cabalState.users || {}
    if (users[key]) {
      return users[key].name || key.substr(0, 6)
    } else {
      return (key && key.substr(0, 6)) || 'Unknown'
    }
  }
}
