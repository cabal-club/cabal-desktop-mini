var Dat = require('dat-node')
var crypto = require('crypto')
var fs = require('fs')
var mkdirp = require('mkdirp')

function CabalFiles (arg) {
  if (!(this instanceof CabalFiles)) return new CabalFiles(arg)
  this.initialStoragePath = arg.storagePath
  this.allowSeedingList = arg.allowSeedingList || []
  this.dats = new Map()
}

CabalFiles.prototype.storagePath = function (userKey) {
  return this.initialStoragePath + userKey + '/'
}

CabalFiles.prototype.getDatKeyFromStoragePath = function (userKey, callback) {
  var storagePath = this.storagePath(userKey)
  if (fs.existsSync(storagePath)) {
    Dat(this.storagePath(userKey), { sparse: true }, function (err, dat) {
      if (err) throw err
      dat.close()
      callback(dat.key.toString('hex'))
    })
  } else {
    callback()
  }
}

CabalFiles.prototype.publish = function (arg, callback) {
  var self = this
  var storagePath = self.storagePath(arg.userKey)

  var fileDir = crypto.randomBytes(32).toString('hex')
  var filePath = storagePath + fileDir + '/'

  mkdirp.sync(filePath)
  fs.copyFileSync(arg.path, filePath + arg.name)

  function importToDat (datData) {
    var dat = self.dats.get(datData.datKey)
    dat.importFiles(function () {
      if (callback) {
        var data = {
          datFileName: fileDir + '/' + arg.name,
          datKey: datData.datKey
        }
        callback(data)
      }
    })
  }

  var datData = {
    datKey: arg.datKey,
    userKey: arg.userKey
  }
  if (self.dats.has(arg.datKey)) {
    importToDat(datData)
  } else {
    self.seed(datData, importToDat)
  }
}

CabalFiles.prototype.seed = function (datData, callback) {
  var self = this
  var storagePath = self.storagePath(datData.userKey)
  mkdirp.sync(storagePath)

  var datArgs = { sparse: true }
  if (datData.datKey) {
    datArgs.key = datData.datKey
    if (!self.dats.has(datData.datKey)) {
      self.dats.set(datData.datKey, undefined)
    }
  }

  Dat(storagePath, datArgs, function (err, dat) {
    if (err) throw err
    var datKey = dat.key.toString('hex')
    self.dats.set(datKey, dat)
    dat.joinNetwork(function () {
      if (callback) {
        datData.datKey = datKey
        callback(datData)
      }
    })
    // dat.on('connection', connection, info)
    // var stats = dat.trackStats()
    // var peers = stats.peers
  })
}

CabalFiles.prototype.seedAll = function (allowSeedingList) {
  var self = this
  allowSeedingList = allowSeedingList || self.allowSeedingList
  allowSeedingList.forEach(function (datData) {
    self.seed(datData)
  })
}

CabalFiles.prototype.stopSeeding = function (datKey) {
  var self = this
  if (datKey) {
    // Stop seeding one
    var dat = self.dats.get(datKey)
    if (dat) {
      dat.close(function () {
        self.dats.delete(datKey)
      })
    }
  } else {
    // Stop seeding all
    self.dats.forEach(function (dat, datKey) {
      dat.close(function () {
        self.dats.delete(datKey)
      })
    })
  }
}

CabalFiles.prototype.fetch = function (arg, callback) {
  var self = this
  function readFile (datData) {
    var dat = self.dats.get(datData.datKey)
    if (dat) {
      dat.archive.readFile(arg.fileName, function (err, file) {
        if (err) throw err
        if (callback) {
          var storagePath = self.storagePath(arg.userKey)
          var data = {
            localPath: storagePath + arg.fileName
          }
          callback(data)
        }
      })
    }
  }

  var datData = {
    datKey: arg.datKey,
    userKey: arg.userKey
  }
  if (self.dats.has(arg.datKey)) {
    readFile(datData)
  } else {
    self.seed(datData, readFile)
  }
}

module.exports = CabalFiles
