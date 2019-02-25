var CabalClassic = require('cabal-core')
// var CabalHyperswarm = require('cabal-core-hyperswarm')
var collect = require('collect-stream')
var crypto = require('hypercore-crypto')
var ram = require('random-access-memory')
var swarmClassic = require('cabal-core/swarm.js')
// var swarmHyper = require('cabal-core-hyperswarm/swarm.js')
var os = require('os')
var fs = require('fs')
var yaml = require('js-yaml')
var mkdirp = require('mkdirp')

const MAX_FEEDS = 1000
const MAX_MESSAGES = 1000

var Cabal = CabalClassic
var swarm = swarmClassic

var config
var homedir = os.homedir()
var rootdir = homedir + `/.cabal-desktop-mini/v${Cabal.databaseVersion}`
var rootconfig = `${rootdir}/config.yml`
var archivesdir = `${rootdir}/archives/`

// make sure the .cabal/v<databaseVersion> folder exists
mkdirp.sync(rootdir)

// create a default config in rootdir if it doesn't exist
if (!fs.existsSync(rootconfig)) {
  saveConfig({ cabals: [], aliases: {} })
}

// Attempt to load local or homedir config file
try {
  config = yaml.safeLoad(fs.readFileSync(rootconfig, 'utf8'))
  if (!config.cabals) { config.cabals = [] }
  if (!config.aliases) { config.aliases = {} }
} catch (e) {
  console.error(e)
  process.exit(1)
}

// if (config.hyperswarm) {
//   Cabal = CabalHyperswarm
//   swarm = swarmHyper
//   console.log('>>>>>>>>>> CABAL on HYPERSWARM >>>>>>>>>>')
// }

function saveConfig (config) {
  // make sure config is well-formatted (contains all config options)
  if (!config.cabals) { config.cabals = [] }
  if (!config.aliases) { config.aliases = {} }
  let data = yaml.safeDump(config, {
    sortKeys: true
  })
  fs.writeFileSync(rootconfig, data, 'utf8')
}

function CabalPlumbing (props) {
  if (!(this instanceof CabalPlumbing)) return new CabalPlumbing(props)
  var self = this

  self.props = props

  self.cabal = undefined
  self.messagesListener = undefined
  self.state = {
    cabals: config.aliases,
    key: undefined,
    channel: 'default',
    channels: [],
    user: {}
  }

  self.addListeners()
}

CabalPlumbing.prototype.addListeners = function (data) {
  var self = this
  self.removeListeners()
  self.incomingEvents = [
    {
      type: 'cabal-remove-cabal',
      func: (event, arg) => self.removeCabal(arg.key)
    },
    {
      type: 'cabal-rename-cabal-alias',
      func: (event, arg) => self.renameCabalAlias(arg.key, arg.alias)
    },
    {
      type: 'cabal-get-state',
      func: (event, arg) => self.getState()
    },
    {
      type: 'cabal-publish-nick',
      func: (event, arg) => self.publishNick(arg.nick)
    },
    {
      type: 'cabal-publish-message',
      func: (event, arg) => self.publishMessage(arg)
    },
    {
      type: 'cabal-load-channel',
      func: (event, arg) => self.loadChannel(arg.channel)
    },
    {
      type: 'cabal-load-cabal',
      func: (event, arg) => self.loadCabal(arg.key)
    }
  ]
  self.incomingEvents.forEach(function (event) {
    event.listener = self.props.incoming.on(event.type, function (e, arg) {
      console.log('==>', event.type, arg)
      event.func(e, arg)
      e.returnValue = arg
    })
  })
}

CabalPlumbing.prototype.removeListeners = function (data) {
  var self = this
  if (self.incomingEvents && self.incomingEvents.length) {
    self.incomingEvents.forEach(function (event) {
      if (self.props.incoming) {
        self.props.incoming.removeListener(event.type, event.listener)
      }
    })
  }
}

CabalPlumbing.prototype.updateFrontend = function (data) {
  if (data) {
    if (data.reason) {
      console.log('***', data.reason)
    }
  }
  this.state.keyAlias = this.getAliasByKey(this.state.key)
  if (data.event && data.event.type) {
    this.props.outgoing.send(data.extraEvent.type, data.extraEvent.data)
  } else {
    this.props.outgoing.send('cabal-state-update', this.state)
  }
}

CabalPlumbing.prototype.loadCabal = function (key, temp) {
  var self = this
  if (!key) {
    key = crypto.keyPair().publicKey.toString('hex')
  }
  self.state.key = key.replace('cabal://', '').replace('cbl://', '').replace('dat://', '').replace(/\//g, '')
  var storage
  if (temp) {
    storage = ram
  } else {
    storage = archivesdir + self.state.key
    if (!Object.values(config.aliases).includes(self.state.key)) {
      config.aliases[self.state.key] = self.state.key
      self.state.cabals = config.aliases
      saveConfig(config)
    }
  }
  self.state.keyAlias = self.getAliasByKey(self.state.key)
  self.cabal = Cabal(storage, self.state.key, { maxFeeds: MAX_FEEDS })
  self.cabal.db.ready(function () {
    swarm(self.cabal)

    self.updateFrontend({ reason: 'cabal db ready' })

    setTimeout(() => {
      self.cabal.channels.get(function (err, channels) {
        if (err) return
        self.state.channels = channels

        self.updateFrontend({ reason: 'get channels' })

        self.loadChannel(self.state.channel)

        self.cabal.channels.events.on('add', function (channel) {
          self.state.channels.push(channel)
          self.state.channels.sort()
          self.updateFrontend({ reason: 'added channel' })
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
            self.updateFrontend({ reason: 'get users' })
            self.updateFrontend({
              type: 'cabal-users-update',
              data: {
                user: self.state.users[key]
              }
            })
          })

          self.cabal.topics.events.on('update', function (msg) {
            self.state.topic = msg.value.content.topic
            self.updateFrontend({ reason: 'get topics' })
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
          self.updateFrontend({ reason: 'peer added' })
        })
        self.cabal.on('peer-dropped', function (key) {
          Object.keys(self.state.users).forEach(function (k) {
            if (k === key) {
              self.state.users[k].online = false
              self.updateFrontend({ reason: 'peer dropped' })
            }
          })
        })

        function updateLocalKey () {
          self.cabal.getLocalKey(function (err, lkey) {
            // set local key for local user
            self.state.user.key = lkey
            if (err) {
              self.updateFrontend({ reason: 'get local key' })
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
            self.updateFrontend({ reason: 'get local key' })
          })
        }
      })
    }, 2000)
  })
}

CabalPlumbing.prototype.loadChannel = function (channel) {
  var self = this
  if (self.messagesListener) {
    self.cabal.messages.events.removeListener(self.state.channel, self.messagesListener)
    self.messagesListener = null
  }

  // clear the old channel state
  self.state.channel = channel
  self.state.messages = []
  self.state.topic = ''
  self.updateFrontend({ reason: 'set fresh channel state' })

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
      messages.reverse()
      messages.forEach(function (msg) {
        self.state.messages.push(self.formatMessage(msg))
      })

      self.updateFrontend({ reason: 'new messages' })
      self.updateFrontend({
        type: 'cabal-messages-update',
        data: {
          messages
        }
      })

      self.cabal.topics.get(channel, (err, topic) => {
        if (err) return
        if (topic) {
          self.state.topic = topic
          self.updateFrontend({ reason: 'get topic' })
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
  self.messagesListener = onMessage

  onMessage()
}

CabalPlumbing.prototype.getState = function () {
  this.updateFrontend({ reason: 'get state' })
}

CabalPlumbing.prototype.publishNick = function (nick) {
  this.cabal.publishNick(nick)
}

CabalPlumbing.prototype.formatMessage = function (message) {
  return message
}

CabalPlumbing.prototype.publishMessage = function (arg) {
  this.cabal.publish({
    type: arg.type || 'chat/text',
    content: {
      channel: this.state.channel,
      text: arg.text
    }
  })
}

CabalPlumbing.prototype.getAliasByKey = function (key, dontTruncate) {
  var index = Object.values(config.aliases).indexOf(key)
  var alias = Object.keys(config.aliases)[index]
  if (alias && !dontTruncate && alias === key) {
    alias = alias.substr(0, 6)
  }
  return alias
}

CabalPlumbing.prototype.getKeyByAlias = function (alias) {
  return config.aliases[alias]
}

CabalPlumbing.prototype.renameCabalAlias = function (key, alias) {
  var aliases = Object.keys(config.aliases)
  var keys = Object.values(config.aliases)
  aliases[keys.indexOf(key)] = alias
  config.aliases = {}
  aliases.forEach(function (alias, index) {
    config.aliases[alias] = keys[index]
  })
  this.state.cabals = config.aliases
  this.updateFrontend({ reason: 'renamed cabal' })
  saveConfig(config)
}

CabalPlumbing.prototype.removeCabal = function (key) {
  var alias = this.getAliasByKey(key, true)
  delete config.aliases[alias]
  delete this.state.cabals[alias]
  this.updateFrontend({ reason: 'removed cabal' })
  saveConfig(config)
}

module.exports = CabalPlumbing
