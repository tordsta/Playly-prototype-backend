const path = require('path');
const express = require('express');
const http = require("http"); //For valedating https certs from certbot 
const https = require('https');
const fs = require("fs");
const websocket = require("ws")
const version = require("./package").version


const httpsApp = express();
const httpsPORT = 3000; 

//For healt checks on AWS
httpsApp.get('/', (req, res) => {
  res.set("Access-Control-Allow-Origin", "*"); //Does not affect wss connections, only HTTPS
  res.send("Hello!");
});

//HTTPS enpoint for checking server status. 
httpsApp.get('/up', (req, res) => {
  res.set("Access-Control-Allow-Origin", "*"); //Does not affect wss connections, only HTTPS
  res.send("Hello! This is the Playly backend. The backend is currently running on version: " + version);
});

//TODO: change back to https
// HTTPS WEB SERVER 
const httpsServer = http.createServer( 
  // Key and cert is required to allow localhost to run on HTTPS otherwise you either get an error or a certified invalid warning
  //{
  //  key: fs.readFileSync(path.resolve(process.env.HOME, '.localhost-ssl/localhost.key')),
  //  cert: fs.readFileSync(path.resolve(process.env.HOME, '.localhost-ssl/localhost.crt')),
  //},
  httpsApp,
);

httpsServer.listen(httpsPORT, () => {
  console.log('\nListening for messages on PORT: ', httpsPORT);
});


// WEBSOCKET SECURED CONNECTION - On top of https server - For testing 
//const wss = new websocket.Server({ server: httpsServer, path: "/wss" });
//wss.on("connection", function(ws){
//  console.log("A client connected with wss on port, uri:", httpsPORT, "/wss")
//});


// Signal server setup for webrtc
const SignalServer = require('./SignalServer');
const signal = new SignalServer({ server: httpsServer }); 

// Starting ws service
signal.connect();
 

