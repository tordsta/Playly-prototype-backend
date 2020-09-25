/* eslint-disable class-methods-use-this */
/* eslint-disable no-underscore-dangle */
const WebSocket = require('ws');
const { Constants } = require('./enums');

class SignalServer {
  /**
   * @param {Object} config is an OPTIONAL object, if no argument is passed in, then
   * we default to creating a SignalServer running on PORT 3001, if a config
   * object exist then it should contain one of two properties:
   * @port is an integer specifying the port number the SignalServer should run on.
   * @server is any server instance that will be used to create a SignalServer, the
   * SignalServer will run on the same port the passed in Server is listening on.
   */
  constructor(config) {
    this._webSocket = this._setUpServer(config);
    this._channels = {}; //json object with all channels/rooms. Where each room has a json object of users/websocket connnections
    this._users = 0;
  }

  /**
   * @param {WebSocket} currentClient
   * @param {http.IncomingMessage} request
   * upon calling #connect, SignalServer will listen for when a client has connected
   * to the server and listen for any incoming messages. When a message event is
   * triggered, it will call on #broadcast.
   */
  connect() {
    this._webSocket.on('connection', (currentClient, request) => {
      console.log('User connected');
      currentClient.send(this._userConnected());

      currentClient.on('message', (data) => {
        //console.log('\nDATA: ', data);
        const parsedData = JSON.parse(data);

        switch (parsedData.type) {
          case Constants.TYPE_CHANNEL: //"type": "ROOM"
            // Creation of a new channel or joining channel
            const { roomKey } = parsedData.payload; //makes an js object and assignes the roomkey value from parsed json
            console.log('New client has joined room ', roomKey);
            // if room exist 
            if (this._channels[roomKey]) {
              this._handleExistingChannel(parsedData.payload, currentClient);
            } else if (!this._channels[roomKey]) {
              // if room doesn't exist
              this._createChannel(parsedData.payload, currentClient);
            }
            break;
          default:
            // Sending messages to client in existing channel
            //TODO - this needs to be directed to one client at the time when establishing an connection
            //TODO cont. - many make an own switchcase for RTC establishing - Offer, awnser, ice candidate
            const clientsInChannel = this._channels[parsedData.payload.roomKey];
            this._broadcast(data, currentClient, clientsInChannel);
        }
      });
    });
  }

  /**
   * @param {Object} data is an object recieved when listening for a 'message' event.
   * @param {WebSocket} currentClient is the client who emitted data to the SignalServer.
   * @param {Array} clients is all clients that exist in a channel.
   *
   * #broadcast is a private method that iterates through a pool of clients inside a channel
   * currently connected to the SignalServer. It sends any data recieved to every other
   * client but itself as long as their connection is open.
   */
  _broadcast(data, currentClient, clients) {
    Object.keys(clients).forEach((clientID) => {
      const client = clients[clientID];
      // checking if the client is from the client who sends the data vs. receiving
      if (client !== currentClient && client.readyState === WebSocket.OPEN) client.send(data);
    });
  }

  _close() {
    this._webSocket.on('close', () => {
      //TODO remove user from room, if room is empty delete room

    });
  }

  /**
   * @param {Object} config
   * #setUpServer is a private method that creates a new instance of a WebSocket utilizing
   * the config parameter if included, otherwise utilizes default port.
   * @returns {WebSocket.Server}
   */
  _setUpServer(config) {
    if (!config) return new WebSocket.Server({ port: Constants.PORT });
    else if (config.port) return new WebSocket.Server({ port: config.port });
    else if (config.server) return new WebSocket.Server({ server: config.server });
    // return an error for wrong input field
    else return console.log('ERROR');
  }

  /**
   * #userConnected is a private method that sets a new ID to send to the new user upon 
   * connection.
   * @returns {String}
   */
  _userConnected() {
    const initialMessage = { type: Constants.NEW_USER, id: this._users };
    this._users += 1; //TODO implement UUidv6, and seperate out from the number of users on the server
    return JSON.stringify(initialMessage);
  }

  /**
   * @param {String} roomKey is used to join an existing channel.
   * @param {Object} message contains a Type and Payload property; Payload contains
   * important information usually from WebRTC.
   * @param {Integer} socketID is an ID thats created upon a new user connecting to
   * the Signaling Server.
   * @param {WebSocket} currentClient is the client who emitted data to the SignalServer.
   *
   * #handleExistingChannel is a private method that upon a user joining an existing
   * channel, will notify the client who created the channel to begin a connection.
   */
  _handleExistingChannel({ roomKey, socketID }, currentClient) {
    // client joins the channel
    this._channels[roomKey][socketID] = currentClient;

    //Create RTC connections to existing clients for the new client
    const clients = this._channels[roomKey];
    //console.log(clients);

    for(const [clientID, client] of Object.entries(this._channels[roomKey])) {
      //console.log("looop", clientID, client);
      //console.log("current client ", currentClient);
      
      if(client != currentClient){
        // TODO: make one on one RTC connection setup 
        // TODO: make frontend handle mulitple users/userIDs for webRTC connections  }
        const ready = { type: Constants.TYPE_CONNECTION, startConnection: true };
        
        //Notify a client that new client is ready to begin WebRTC Connection
        const data = JSON.stringify(ready);
        this._broadcast(data, currentClient, {key: client});
      } 
    }    

    console.log("Number of clients in room", roomKey, ":", Object.keys(this._channels[roomKey]).length);
    //console.log("Clients: ", clients);
  }

  /**
   * @param {String} roomKey is used to create a channel.
   * @param {Integer} socketID is an ID thats created upon a new user connecting to
   * the Signaling Server.
   * @param {WebSocket} currentClient is the client who emitted data to the SignalServer.
   */
  _createChannel({ roomKey, socketID }, currentClient) {
    // create new channel & store current client
    this._channels[roomKey] = { [socketID]: currentClient };
    console.log('New room has been created with key: ', roomKey, ' by User: ', socketID);
    console.log('Number of rooms on server: ', Object.keys(this._channels).length); //Channels is the same as rooms. Each channel is an JS object. 
  }
}

module.exports = SignalServer;
