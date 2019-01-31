var resolvePath = require('electron-collection/resolve-path')
var defaultMenu = require('electron-collection/default-menu')
var electron = require('electron')

var BrowserWindow = electron.BrowserWindow
var Menu = electron.Menu
var app = electron.app

var win

var windowStyles = {
  width: 800,
  height: 1000,
  titleBarStyle: 'hidden-inset',
  minWidth: 640,
  minHeight: 395
}

app.setName('cabal-desktop-mini')

var shouldQuit = app.makeSingleInstance(createInstance)
if (shouldQuit) app.quit()

app.on('ready', function () {
  win = new BrowserWindow(windowStyles)
  var root = process.env.NODE_ENV === 'development'
    ? 'https://localhost:8080'
    : 'file://' + resolvePath('./index.html')
  win.loadURL(root)

  win.webContents.on('did-finish-load', function () {
    win.show()
    var menu = Menu.buildFromTemplate(defaultMenu(app, electron.shell))
    Menu.setApplicationMenu(menu)
    if (process.env.NODE_ENV === 'development') {
      win.webContents.openDevTools({ mode: 'detach' })
    }
  })

  win.on('closed', function () {
    win = null
  })
})

if (process.env.NODE_ENV === 'development') {
  app.on('certificate-error', function (event, webContents, url, err, cert, cb) {
    if (url.match('https://localhost')) {
      event.preventDefault()
      cb(true)
    } else {
      cb(false)
    }
  })
}

app.on('window-all-closed', function () {
  app.quit()
})

function createInstance () {
  if (win) {
    if (win.isMinimized()) win.restore()
    win.focus()
  }
}