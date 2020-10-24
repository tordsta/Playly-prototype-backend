//const { io } = require('../servers');
const gameLogic = require('./gameLogic');
const { sendAvailableGames } = require('./gameLogic.utils');
//const User = require('../models/User');

//Games have to be tied to rooms, each room can have one game. 
let currentGames = {};


function unoParty(currentClientSocket, senderID, currentRoom, payload, broadcast, roomKey, users){

  //parse and treat payload from message
  console.log("Client game message:", payload);

  //create sender function something like this
  function sendGameMessageTo(message, reciverID){
    let gameMessage = JSON.stringify({type: "UNO_PARTY", roomKey: roomKey, senderID: senderID, payload: message});
    let reciver = users[reciverID]
    reciver.send(gameMessage);
  }

  function sendGameMessage(message){
    let gameMessage = JSON.stringify({type: "UNO_PARTY", roomKey: roomKey, senderID: senderID, payload: message});
    currentClientSocket.send(gameMessage);
  }

  function broadcastGameMessage(message){
    let gameMessage = JSON.stringify({type: "UNO_PARTY", roomKey: roomKey, senderID: senderID, payload: message});
    broadcast(gameMessage, currentClientSocket, currentRoom)
  }

  function broadcastAllGameMessage(message){
    let gameMessage = JSON.stringify({type: "UNO_PARTY", roomKey: roomKey, senderID: senderID, payload: message});
    broadcast(gameMessage, null, currentRoom)
  }


  //console.log("current room", currentRoom)
  //sendGameMessage("hello world");

  //create game for a room
  gameLogic(
    currentGames, 
    roomKey, 
    payload, 
    sendGameMessage, 
    broadcastGameMessage, 
    senderID, 
    sendGameMessageTo, 
    broadcastAllGameMessage,
    currentRoom
  );

  //comparison to prev
  //gameLogic(currentGames, socket, username, sendMessage);

}

/*

  //The variable "inLobby" should be true to enter directly to the lobby
  socket.on('requestAvailableGames', () => {
    sendAvailableGames(currentGames);
  });

});
*/

module.exports = unoParty;