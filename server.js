const path = require('path');
const express = require('express');
const https = require('https');
const fs = require("fs");
const websocket = require("ws")


const httpsApp = express();
const httpsPORT = 3000; //change to 443


//HTTPS enpoint for checking server status. 
httpsApp.get('/up', (req, res) => {
  res.set("Access-Control-Allow-Origin", "*"); //Does not affect wss connections, only HTTPS
  res.send("Hello! This is the playly backend. The backend is currently running.");
});


// HTTPS WEB SERVER
const httpsServer = https.createServer(
  // Key and cert is required to allow localhost to run on HTTPS otherwise you either get an error or a certified invalid warning
  {
    key: fs.readFileSync(path.resolve(process.env.HOME, '.localhost-ssl/localhost.key')),
    cert: fs.readFileSync(path.resolve(process.env.HOME, '.localhost-ssl/localhost.crt')),
  },
  httpsApp,
);

httpsServer.listen(httpsPORT, () => {
  console.log('\nListening for HTTPS requests on PORT: ', httpsPORT);
});


// WEBSOCKET SECURED CONNECTION - On top of https server //
const wss = new websocket.Server({ server: httpsServer, path: "/wss" });
wss.on("connection", function(ws){
  console.log("A client connected with wss on port, uri:", httpsPORT, "/wss")
});



// TODO create signal server for webrtc
//const SignalServer = require('./SignalServer');
//const signal = new SignalServer({ server });
//signal.connect();

