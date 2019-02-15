var defaultMenu = require('electron-collection/default-menu')
var electron = require('electron')
const path = require('path')
const { ipcMain } = require('electron')
const { format } = require('url')

var CabalPlumbing = require('./cabal-plumbing')

const isDevelopment = process.env.NODE_ENV !== 'production'
var BrowserWindow = electron.BrowserWindow
var Menu = electron.Menu
var app = electron.app

var window

var windowStyles = {
  width: 640,
  height: 800,
  titleBarStyle: 'hidden',
  minWidth: 640,
  minHeight: 480,
  nodeIntegration: false
}

var cabalPlumbing

app.setName('Cabal Mini')

app.requestSingleInstanceLock()
app.on('second-instance', (event, argv, cwd) => {
  app.quit()
})

app.on('ready', function () {
  window = new BrowserWindow(windowStyles)

  if (isDevelopment) {
    window.webContents.openDevTools()
  }

  if (isDevelopment) {
    window.loadURL(`http://localhost:${process.env.ELECTRON_WEBPACK_WDS_PORT}`)
  } else {
    window.loadURL(format({
      pathname: path.join(__dirname, 'index.html'),
      protocol: 'file',
      slashes: true
    }))
  }

  window.webContents.on('did-finish-load', function () {
    window.show()
    var menu = Menu.buildFromTemplate(defaultMenu(app, electron.shell))
    Menu.setApplicationMenu(menu)
  })

  window.on('closed', function () {
    win = null
  })

  window.webContents.on('devtools-opened', () => {
    window.focus()
    setImmediate(() => {
      window.focus()
    })
  })

  if (!cabalPlumbing) {
    cabalPlumbing = CabalPlumbing({
      incoming: ipcMain,
      outgoing: window.webContents
    })
  } else {
    cabalPlumbing.addListeners()
  }
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
    if (window.isMinimized()) window.restore()
    window.focus()
  }
}
