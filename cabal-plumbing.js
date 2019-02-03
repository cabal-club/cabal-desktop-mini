var Cabal = require('cabal-core')
var collect = require('collect-stream')
var crypto = require('hypercore-crypto')
var ram = require('random-access-memory')
var swarm = require('cabal-core/swarm.js')

const MAX_FEEDS = 1000
const MAX_MESSAGES = 1000

function CabalPlumbing (props) {
  if (!(this instanceof CabalPlumbing)) return new CabalPlumbing(props)
  var self = this

  self.state = {
    key: '5c745b61f6fc050916a6a46ca392b14e5ece22cf15c5807ff737ff0695b7a0b2',
    channel: 'default',
    channels: [],
    user: {}
  }
  var messagesListener

  props.incoming.on('cabal-publish-nick', (event, nick) => {
    console.log('cabal-update', nick)
    self.publishNick(nick)
    event.returnValue = nick
  })

  props.incoming.on('cabal-publish-message', (event, arg) => {
    console.log('cabal-publish-message', arg)
    self.publishMessage(arg.message)
    event.returnValue = arg
  })

  props.incoming.on('cabal-load-channel', (event, arg) => {
    console.log('cabal-load-channel', arg)
    loadChannel(arg.channel)
    event.returnValue = arg
  })

  function updateFrontend (data) {
    if (data) {
      if (data.reason) {
        console.log('update frontend: ' + data.reason)
      }
    }
    props.outgoing.send('cabalPlumbingUpdate', self.state)
  }

  function createCabal (key) {
    self.state.key = key.replace('cabal://', '').replace('cbl://', '').replace('dat://', '').replace(/\//g, '')
    // var storage = args.temp ? ram : archivesdir + key
    var storage = ram
    return Cabal(storage, self.state.key, { maxFeeds: MAX_FEEDS })
  }

  self.cabal = createCabal(self.state.key)
  self.cabal.db.ready(function () {
    swarm(self.cabal)

    updateFrontend({ reason: 'cabal ready' })

    setTimeout(() => {
      self.cabal.channels.get(function (err, channels) {
        if (err) return
        self.state.channels = channels

        updateFrontend({ reason: 'get channels' })

        loadChannel(self.state.channel)

        self.cabal.channels.events.on('add', function (channel) {
          self.state.channels.push(channel)
          self.state.channels.sort()
          updateFrontend({ reason: 'added channel' })
        })
      })

      self.cabal.users.getAll(function (err, users) {
        if (err) return
        self.state.users = users

        updateLocalKey()

        self.cabal.users.events.on('update', function (key) {
          self.cabal.users.get(key, function (err, user) {
            if (err) return
            self.state.users[key] = Object.assign(self.state.users[key] || {}, user)
            if (self.state.user && key === self.state.user.key) self.state.user = self.state.users[key]
            if (!self.state.user) updateLocalKey()
            updateFrontend({ reason: 'get users' })
          })

          self.cabal.topics.events.on('update', function (msg) {
            self.state.topic = msg.value.content.topic
            updateFrontend({ reason: 'get topics' })
          })
        })

        self.cabal.on('peer-added', function (key) {
          var found = false
          Object.keys(self.state.users).forEach(function (k) {
            if (k === key) {
              self.state.users[k].online = true
              found = true
            }
          })
          if (!found) {
            self.state.users[key] = {
              key: key,
              online: true
            }
          }
          updateFrontend({ reason: 'peer added' })
        })
        self.cabal.on('peer-dropped', function (key) {
          Object.keys(self.state.users).forEach(function (k) {
            if (k === key) {
              self.state.users[k].online = false
              updateFrontend({ reason: 'peer dropped' })
            }
          })
        })

        function updateLocalKey () {
          self.cabal.getLocalKey(function (err, lkey) {
            // set local key for local user
            self.state.user.key = lkey
            if (err) {
              updateFrontend({ reason: 'get local key' })
              return
            }
            // try to get more data for user
            Object.keys(users).forEach(function (key) {
              if (key === lkey) {
                self.state.user = users[key]
                self.state.user.local = true
                self.state.user.online = true
              }
            })
            updateFrontend({ reason: 'get local key' })
          })
        }
      })
    }, 2000)
  })

  var loadChannel = function (channel) {
    if (messagesListener) {
      self.cabal.messages.events.removeListener(self.state.channel, messagesListener)
      messagesListener = null
    }

    // clear the old channel state
    self.state.channel = channel
    self.state.messages = []
    self.state.topic = ''
    updateFrontend({ reason: 'set fresh channel state' })

    var pending = 0
    function onMessage () {
      if (pending > 0) {
        pending++
        return
      }
      pending = 1

      var rs = self.cabal.messages.read(channel, { limit: MAX_MESSAGES, lt: '~' })
      collect(rs, function (err, messages) {
        if (err) return

        self.state.messages = []
        // messages.reverse()
        messages.forEach(function (msg) {
          self.state.messages.push(self.formatMessage(msg))
        })

        updateFrontend({ reason: 'new messages' })

        self.cabal.topics.get(channel, (err, topic) => {
          if (err) return
          if (topic) {
            self.state.topic = topic
            updateFrontend({ reason: 'get topic' })
          }
        })

        if (pending > 1) {
          pending = 0
          onMessage()
        } else {
          pending = 0
        }
      })
    }

    self.cabal.messages.events.on(channel, onMessage)
    messagesListener = onMessage

    onMessage()
  }
}

CabalPlumbing.prototype.publishNick = function (nick) {
  this.cabal.publishNick(nick)
}

CabalPlumbing.prototype.formatMessage = function (message) {
  return message
}

CabalPlumbing.prototype.publishMessage = function (message) {
  this.cabal.publish({
    type: 'chat/text',
    content: {
      channel: this.state.channel,
      text: message
    }
  })
}

module.exports = CabalPlumbing
