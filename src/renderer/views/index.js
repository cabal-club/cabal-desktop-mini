var html = require('choo/html')

var Icon = require('../images/cabal.png')

var TITLE = 'Cabal Mini'

module.exports = view

function view (state, emit) {
  if (state.title !== TITLE) emit(state.events.DOMTITLECHANGE, TITLE)

  setTimeout(function () {
    navigate('/cabals')
  }, 1000)

  //<img src=${Icon} class="w2 pointer mb5" />
  return html`
    <body class="sans-serif pa4 flex flex-column items-center justify-center">

    </body>
  `

  function navigate (location) {
    emit(state.events.PUSHSTATE, location)
  }
}
