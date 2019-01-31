# cabal-desktop-mini
A very cute Electron app

## Routes
Route              | File               | Description                     |
-------------------|--------------------|---------------------------------|
`/`              | `views/main.js`  | The main view
`/*`             | `views/404.js`   | Display unhandled routes

## Commands
Command                | Description                                      |
-----------------------|--------------------------------------------------|
`$ npm start`        | Start the Electron process
`$ npm test`         | Lint, validate deps & run tests
`$ npm run build`    | Compile all files into `dist/`
`$ npm run dev`      | Start the development server
`$ npm run inspect`  | Inspect the bundle's dependencies