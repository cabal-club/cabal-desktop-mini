var Dat = require('dat-node')
var crypto = require('crypto')
var fs = require('fs')
var mkdirp = require('mkdirp')

function CabalFiles (arg) {
  if (!(this instanceof CabalFiles)) return new CabalFiles(arg)
  this.initialStoragePath = arg.storagePath
}

CabalFiles.prototype.storagePath = function (userKey) {
  return this.initialStoragePath + userKey + '/'
}

CabalFiles.prototype.publish = function (arg, callback) {
  var self = this
  var storagePath = self.storagePath(arg.userKey)

  var fileDir = crypto.randomBytes(32).toString('hex')
  var filePath = storagePath + fileDir + '/'

  mkdirp.sync(filePath)
  fs.copyFileSync(arg.path, filePath + arg.name)

  Dat(storagePath, { sparse: true }, function (err, dat) {
    if (err) throw err
    dat.importFiles(function () {
      dat.joinNetwork()
      if (callback) {
        var data = {
          datFileName: fileDir + '/' + arg.name,
          datKey: dat.key.toString('hex')
        }
        callback(data)
      }
    })
  })
}

CabalFiles.prototype.fetch = function (arg, callback) {
  var self = this
  var storagePath = self.storagePath(arg.userKey)
  mkdirp.sync(storagePath)
  Dat(storagePath, { key: arg.datKey, sparse: true }, function (err, dat) {
    if (err) throw err
    dat.resume()
    dat.archive.readFile(arg.fileName, function (err, file) {
      if (err) throw err
      if (callback) {
        var data = {
          localPath: storagePath + arg.fileName
        }
        callback(data)
      }
    })
  })
}

module.exports = CabalFiles
