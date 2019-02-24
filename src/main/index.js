var defaultMenu = require('electron-collection/default-menu')
const path = require('path')
const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron')
const { format } = require('url')

var CabalPlumbing = require('./cabal-plumbing')

const isDevelopment = process.env.NODE_ENV !== 'production'

var window

var windowStyles = {
  width: 640,
  height: 800,
  frame: true,
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
    var menu = Menu.buildFromTemplate(defaultMenu(app, shell))
    Menu.setApplicationMenu(menu)
  })

  window.on('closed', function () {
    window = null
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

app.on('window-all-closed', function () {
  app.quit()
})
