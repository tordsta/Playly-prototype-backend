const express = require('express');
const http = require("http"); 
const version = require("./package").version


const httpApp = express();
const httpPORT = 3000; 


//For healt checks on AWS
httpApp.get('/', (req, res) => {
  res.set("Access-Control-Allow-Origin", "*"); //Does not affect wss connections, only HTTPS
  res.send("Hello!");
});


//HTTPS enpoint for checking server status. 
httpApp.get('/up', (req, res) => {
  res.set("Access-Control-Allow-Origin", "*"); //Does not affect wss connections, only HTTPS
  res.send("Hello! This is the Playly backend. The backend is currently running on version: " + version);
});


const httpServer = http.createServer( 
  // Key and cert is required to allow localhost to run on HTTPS otherwise you either get an error or a certified invalid warning
  //{
  //  key: fs.readFileSync(path.resolve(process.env.HOME, '.localhost-ssl/localhost.key')),
  //  cert: fs.readFileSync(path.resolve(process.env.HOME, '.localhost-ssl/localhost.crt')),
  //},
  httpApp,
);


httpServer.listen(httpPORT, () => {
  console.log('\nListening for messages on PORT: ', httpPORT);
});


// Signal server setup for webrtc
const SignalServer = require('./SignalServer');
const signal = new SignalServer({ server: httpServer }); 

// Starting ws service
signal.connect();
 

