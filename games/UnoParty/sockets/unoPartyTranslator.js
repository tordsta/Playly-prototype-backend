//const { io } = require('../servers');
const gameLogic = require('./gameLogic');
const { sendAvailableGames } = require('./gameLogic.utils');
//const User = require('../models/User');

//Games have to be tied to rooms, each room can have one game. 
let currentGames = {};


function unoParty(currentClientSocket, senderID, currentRoom, payload, broadcast, roomKey){

  //parse and treat payload from message
  console.log("This is a game message:", payload);

  //create sender function something like this
  
  function sendGameMessage(message){
    let gameMessage = JSON.stringify({type: "UNO_PARTY", roomKey: roomKey, senderID: senderID, payload: message});
    currentClientSocket.send(gameMessage);
  }

  function broadcastGameMessage(message){
    let gameMessage = JSON.stringify({type: "UNO_PARTY", roomKey: roomKey, senderID: senderID, payload: message});
    broadcast(gameMessage, currentClientSocket, currentRoom)
  }

  sendGameMessage("hello world");

  //create game for a room
  //gameLogic(currentGames, payload, sendGameMessage, broadcastGameMessage);

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