/* eslint-disable class-methods-use-this */
/* eslint-disable no-underscore-dangle */
const WebSocket = require('ws');
const { Constants } = require('./enums');
const { v4:uuidv4, stringify } = require('uuid');
const { response } = require('express');
const unoParty = require("./games/UnoParty/sockets/unoPartyTranslator");

class SignalServer {
  constructor(config) {
    this._webSocket = this._setUpServer(config);
    this._channels = {}; //json object with all channels/rooms. Where each room has a json object of users/websocket connnections
    this._users = {}; //{id: websocket, ..., ...}
  }


  _setUpServer(config) {
    if (!config) return new WebSocket.Server({ port: Constants.PORT });
    else if (config.port) return new WebSocket.Server({ port: config.port });
    else if (config.server) return new WebSocket.Server({ server: config.server });
    // return an error for wrong input field
    else return console.log('ERROR');
  }


  connect() {
    this._webSocket.on('connection', (currentClient, request) => {
      console.log('User connected');
      currentClient.send(this._userConnected(currentClient));

      currentClient.on('message', (data) => {
        //console.log('\nDATA: ', data);
        const parsedData = JSON.parse(data);
        switch (parsedData.type) {

          case "ROOM": //Create room/channel or make user join existing room/channel 
          //TODO: change to auto creation of room key  
          const { roomKey } = parsedData.payload; //makes an js object and assignes the roomkey value from parsed json
            // create new room
            if(!this._channels[roomKey]) {
              this._createChannel(parsedData.payload, currentClient);
            }
            // join existing room
            if (this._channels[roomKey]) {
              this._handleUserJoiningChannel(parsedData.payload, currentClient);
            } 
            break;

          case "PEER_CONNECTION":
            let peerSender = parsedData.payload.socketID;  
            let peerReceiver = parsedData.payload.message; 
            this._startRTCConnection(peerSender, peerReceiver);
            break;

          //TODO Make getUsersInRoom() case

          case "UNO_PARTY":
            //Room has to exist before a game can begin
            //console.log(parsedData)
            if(this._channels[parsedData.roomKey]){
              let currentRoom = this._channels[parsedData.roomKey];
              let senderID = parsedData.senderID;
              let roomKey = parsedData.roomKey;
              unoParty(currentClient, senderID, currentRoom, parsedData.payload, this._broadcast, roomKey, this._users);
            }
            break;
          
          default: //Broadcasts to all users in a room 
            //console.log(parsedData)            
            try{
              const clientsInChannel = this._channels[parsedData.payload.roomKey];
              this._broadcast(data, currentClient, clientsInChannel);                
            } 
            catch(e) {
              console.log("error", e)
            }
        }
      });
    });
  }


  _userConnected(currentClient) {
    //TODO: change to auto creation of room key and send to client
    const id = uuidv4();
    this._users[id] = currentClient;
    const initialMessage = { type: Constants.NEW_USER, id: id };
    return JSON.stringify(initialMessage);
  }


  _broadcast(data, currentClient, clients) {
    Object.keys(clients).forEach((clientID) => {
      const client = clients[clientID];
      // checking if the client is from the client who sends the data vs. receiving
      if (client !== currentClient && client.readyState === WebSocket.OPEN) client.send(data);
    });
  }

  
  _createChannel({ roomKey, socketID }, currentClient) {
    //socketID matches userID
    
    // create new channel & store current client
    this._channels[roomKey] = { [socketID]: currentClient };

    //Update createor client on users in room
    const usersInRoom = { type: "USERS_IN_ROOM", payload: Object.keys(this._channels[roomKey]) };
    const data = JSON.stringify(usersInRoom);
    const clients = this._channels[roomKey];
    this._broadcast(data, null, clients);

    console.log('New room has been created with key: ', roomKey, ' by User: ', socketID);
    console.log('Number of rooms on server: ', Object.keys(this._channels).length); //Channels is the same as rooms. Each channel is an JS object. 
  }


  _handleUserJoiningChannel({ roomKey, socketID }, currentClient) {
    // Add client to channel
    this._channels[roomKey][socketID] = currentClient;

    //Update the last client on users in room
    //This means the user joining will be giving offers to the other clients. This way we avoid conflicting communication.
    const usersInRoom = { type: "USERS_IN_ROOM", payload: Object.keys(this._channels[roomKey]) };
    const data = JSON.stringify(usersInRoom);
    currentClient.send(data);
    console.log('New client has joined room ', roomKey);
    console.log("Number of clients in room", roomKey, ":", Object.keys(this._channels[roomKey]).length);
  }


  _startRTCConnection(sender, receiver){
    console.log("Start rtc connection sender:", sender)
    console.log("start rtc connection receiver:", receiver)
    //Notify a client that new client is ready to begin WebRTC Connection
    const ready = { 
      type: Constants.TYPE_CONNECTION, 
      startConnection: true, 
      sender: sender, 
      receiver: receiver,
    };
    const data = JSON.stringify(ready);
    //sends message to both?? both are ready to connect??
    const clients = { [sender]:this._users[sender], [receiver]:this._users[receiver] }
    this._broadcast(data, null, clients);
  }


  _close() {
    this._webSocket.on('close', () => {
      //TODO remove user from room, if room is empty delete room

    });
  }
}

module.exports = SignalServer;
