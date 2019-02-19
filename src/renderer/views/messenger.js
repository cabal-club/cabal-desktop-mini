var html = require('choo/html')
var Identicon = require('identicon.js')
var moment = require('moment')
const { ipcRenderer } = window.require('electron')

var TITLE = 'Cabal Mini'

module.exports = function (state, emit) {
  // if (!state.cabalState.key) {
  //   document.location = '/cabals'
  // }

  if (state.title !== TITLE) emit(state.events.DOMTITLECHANGE, TITLE)
  state.messageHistory = state.messageHistory || []
  state.cabalState.key = state.cabalState.key || ''
  state.cabalState.channel = state.cabalState.channel || 'default'
  state.cabalState.channels = state.cabalState.channels || []
  state.cabalState.messages = state.cabalState.messages || []
  state.cabalState.currentUser = state.cabalState.user || { key: '' }
  state.cabalState.users = state.cabalState.users || {}

  var keyShort = state.cabalState.keyAlias || state.cabalState.key.substr(0, 6) || 'CABALS'
  var currentUserName = state.cabalState.currentUser.name || (state.cabalState.currentUser.key && state.cabalState.currentUser.key.substr(0, 6))
  var previousMessage = {}

  setTimeout(function () {
    scrollToBottom()
  }, 1000)

  return html`
    <body class="sans-serif flex flex-column">
      <nav class="ph4 pt4">
        <a style="opacity: 0" class="f6 link br3 ph3 pv2 mb1 dib white bg-black" href="/">Cabal</a>
      </nav>
      <h1 class="ph4 f3 f2-m f1-l">
        <a href="/" class="hover-dark-pink link black" title="Cabal">${TITLE}</a>
        <a href="/" class="hover-dark-pink link black-50 b f6 f5-ns dib mh3 ttu" title="${keyShort}">${keyShort}</a>
        <a href="/settings" class="hover-dark-pink pointer link black-50 b f6 f5-ns dib mr3 ttu" title="${state.cabalState.currentUser.key}">${currentUserName}</a>
        <a href="/peers" class="hover-dark-pink link black-50 b f6 f5-ns dib mr3 ttu" title="Peers">PEERS</a>
      </h1>

      <nav class="ph4 w-100 pv3 bt bb b--black-10">
        ${state.cabalState.channels.map((channel) => {
          return html`<a class="hover-dark-pink pointer link ${channel === state.cabalState.channel ? 'black' : 'gray'} b f6 f5-ns dib mr3 ttu" title="${channel}" onclick=${function () { loadChannel(channel) }}>${channel}</a>`
        })}
        <a onclick=${onClickNewChannel} class="hover-dark-pink pointer link gray b f6 f5-ns dib mr3 ttu" title="New Channel">+</a>
      </nav>
      <article id="messages" class="pa4 flex-auto" style="overflow: scroll">
        ${state.cabalState.messages.map((message) => {
          var showAvatar = (previousMessage.key !== message.key)
          previousMessage = message
          var name = keyToUsername(message.key)
          var text = message.value.content.text
          var timestamp = message.value.timestamp
          return html`
            <article class="dt w-100 b--black-05 pb3 mt2">
              <div class="dtc v-top" style="width: 2.5rem">
                ${renderAvatar(message, showAvatar)}
              </div>
              <div class="dtc v-mid pl1">
                <div class="flex">
                  ${showAvatar ? html`<h1 class="f7 fw9 ttu mb1 mt0">${name}</h1>` : ''}
                  <time class="f7 fw9 ttu mb1 mt0 ml2 black-30" style="${!showAvatar ? 'height: 0; opacity: 0' : ''}" title=${moment(timestamp).calendar()} datetime=${moment(timestamp).format()}>${moment(timestamp).format('h:mm A')}</time>
                </div>
                <p class="f5 fw5 mt0 mb0 black-70">${text}</p>
              </div>
            </article>
          `
        })}
      </article>
      <div class="ph4">
        <input placeholder="Message #${state.cabalState.channel}" id="messageInput" onkeyup=${onMessageInputKeypress} class="input-reset ba b--black-50 bw2 br3 pa2 mb3 db w-100" type="text">
      </div>
    </body>
  `

  function renderAvatar (message, showAvatar) {
    if (showAvatar) {
      var identicon = new Identicon(message.key, {
        saturation: 1,
        brightness: 0.15,
        margin: 0,
        background: [255, 255, 255, 255]
      }).toString()
      return html`<img src="data:image/png;base64,${identicon}" class="db br2 w2"/>`
    }
  }

  function scrollToBottom (force) {
    // if (!force && !this.shouldAutoScroll) return
    var messagesDiv = document.getElementById('messages')
    if (messagesDiv) {
      messagesDiv.scrollTop = messagesDiv.scrollHeight
    }
  }

  function onClickNewChannel () {
    var input = document.getElementById('messageInput')
    input.value = '/join '
    input.focus()
  }

  function onMessageInputKeypress (event) {
    event.preventDefault()
    if (event.keyCode === 13) {
      sendMessage({})
    }
  }

  function buildCommands () {
    var commands = {
      nick: {
        help: () => 'change your display name',
        call: (arg) => {
          if (arg === '') return
          publishNick(arg)
        }
      },
      emote: {
        help: () => 'write an old-school text emote',
        call: (arg) => {
          sendMessage({
            text: arg,
            type: 'chat/emote'
          })
        }
      },
      join: {
        help: () => 'join a new channel',
        call: (arg) => {
          if (arg === '') arg = 'default'
          loadChannel(arg)
        }
      },
      quit: {
        help: () => 'exit the cabal process',
        call: (arg) => {
          // TODO
          // process.exit(0)
        }
      },
      topic: {
        help: () => 'set the topic/description/`message of the day` for a channel',
        call: (arg) => {
          // TODO
          // self.cabal.publishChannelTopic(self.channel, arg)
        }
      },
      whoami: {
        help: () => 'display your local user key',
        call: (arg) => {
          // TODO
          // self.view.writeLine.bind(self.view)('Local user key: ' + self.cabal.client.user.key)
        }
      },
      alias: {
        help: () => 'set alias for the cabal',
        call: (arg) => {
          renameCabalAlias(arg)
        }
      },
      add: {
        help: () => 'add a cabal',
        call: (arg) => {
          addAnotherCabal(arg)
        }
      }
    }

    // add aliases to commands
    function alias (command, alias) {
      commands[alias] = {
        help: commands[command].help,
        call: commands[command].call
      }
    }
    alias('emote', 'me')
    alias('join', 'j')
    alias('nick', 'n')
    alias('topic', 'motd')
    alias('whoami', 'key')
    alias('quit', 'exit')

    return commands
  }

  function sendMessage (props) {
    var text = props.text || document.getElementById('messageInput').value
    text = text.trim()
    state.messageHistory.push(text)
    if (state.messageHistory.length > 1000) state.messageHistory.shift()

    var commandPattern = (/^\/(\w*)\s*(.*)/)
    var match = commandPattern.exec(text)
    var cmd = match ? match[1] : ''
    var arg = match ? match[2] : ''
    arg = arg.trim()

    var commands = buildCommands()
    if (cmd in commands) {
      commands[cmd].call(arg)
    } else if (cmd) {
      console.log(`${cmd} is not a command, type /help for commands`)
    } else {
      text = text.trim()
      if (text !== '') {
        ipcRenderer.sendSync('cabal-publish-message', {
          channel: state.cabalState.channel,
          text,
          type: props.type
        })
      }
    }
  }

  function loadChannel (channel) {
    ipcRenderer.sendSync('cabal-load-channel', { channel })
  }

  function publishNick (nick) {
    ipcRenderer.sendSync('cabal-publish-nick', { nick })
  }

  function renameCabalAlias (alias) {
    ipcRenderer.sendSync('cabal-rename-cabal-alias', {
      alias,
      key: state.cabalState.key
    })
  }

  function addAnotherCabal (key) {
    ipcRenderer.sendSync('cabal-load-cabal', {
      key
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
