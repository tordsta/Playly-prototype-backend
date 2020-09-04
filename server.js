const path = require('path');
const express = require('express');
const https = require('http');

const app = express();
const PORT = 443; //default https port
const SignalServer = require('./SignalServer');

app.get('/', (req, res) => {
  res.send("Hello! This is the playly backend.");
});
// Adding in a express server to HTTPS to allow HTTPS
const server = https.createServer(
  // {
  //   key: fs.readFileSync(path.resolve(__dirname, './ssl_diane/server.key')),
  //   // // is required to allow localhost to run on HTTPS
  //   // // otherwise you either get an error or a certified invalid warning
  //   cert: fs.readFileSync(path.resolve(__dirname, './ssl_diane/server.crt')),
  // },
  app,
);

// WEBSOCKET SECURED CONNECTION //
// const wss = new WebSocket.Server({ server });
const signal = new SignalServer({ server });
signal.connect();
// const wss = new WebSocket.Server({ port: PORT });

server.listen(PORT, () => {
  console.log('\nListening on PORT: ', PORT);
});
