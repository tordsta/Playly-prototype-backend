//const { io } = require('../servers');
const Game = require('../classes/Game');
//const User = require('../models/User');
const uniqid = require('uniqid');
const {
  sendAvailableGames,
  generateRandomCard,
  sanitizePlayer,
  isPlayerTurn,
  updateCurrentPlayerTurnIndex,
  canPlayCard,
  colors,
  finishGame
} = require('./gameLogic.utils');

// we might need an broadcastAllGameMessage, for game logic
//gameLogic(currentGames, payload, sendGameMessage, broadcastGameMessage);
function gameLogic(
  currentGames, 
  roomKey, 
  payload, 
  sendGameMessage, 
  broadcastGameMessage, 
  senderID,
  sendGameMessageTo, 
  broadcastAllGameMessage,
  currentRoom
  ) {
  let currentRoomId = undefined;


  switch(payload.type){
    case "createGame":
      //roomkey == roomName == roomID
      const maxPlayers = payload.payload.maxPlayers
      const roomName = payload.payload.name 
      const host = senderID
      if (!maxPlayers || !roomName)
        return sendGameMessage('Please provide all the info needed');
      const roomId = roomKey;
      const game = new Game(maxPlayers, roomName, roomId, host);
      currentRoomId = roomId;

      currentGames[roomId] = {
        ...game,
        hostSocket: senderID
      };
      //socket.join(`${roomId}`);
      currentRoomId = roomId;

      sendGameMessage({type: 'gameCreated', payload: {
        ...game,
        isHost: true
      }})
      sendAvailableGames(currentGames, sendGameMessage);
      break;

    case "startGame": //socket.on('startGame', roomId => {
      console.log("statement",
        currentGames[roomKey] &&
        currentGames[roomKey].hostSocket === String(senderID) &&
        currentGames[roomKey].playerCount > 1
      );
      //console.log("1", currentGames[roomKey])
      console.log("2", currentGames[roomKey].hostSocket === String(senderID))
      console.log("3", currentGames[roomKey].playerCount > 1)
      if (
        currentGames[roomKey] &&
        currentGames[roomKey].hostSocket === String(senderID) &&
        currentGames[roomKey].playerCount > 1
      ) {
        const gameToStart = currentGames[roomKey];
        gameToStart.inLobby = false;
        sendAvailableGames(currentGames, broadcastAllGameMessage);
  
        gameToStart.players.forEach((player, idx) => {
          for (let i = 0; i < 7; i++) {
            gameToStart.players[idx].cards.push(generateRandomCard());
          }
        });

        
        const currentCard = generateRandomCard();
        gameToStart.currentCard = currentCard;
        const players = gameToStart.players;
        /*
        const players = sanitizePlayer(
          gameToStart,
          clientSocket.handshake.query.username
        );
        */
        broadcastAllGameMessage({type: "initGame", payload: {players: players, currentCard: currentCard}})

      } else {
        sendGameMessage('Could not start game');
      }
      break;

    case "joinGame": //socket.on('joinGame', ({ roomId }) => {
      if (currentGames[roomKey]) {
        const gameToJoin = currentGames[roomKey];
        if (gameToJoin.playerCount === gameToJoin.maxPlayers) {
          return sendGameMessage('The game you are trying to join is full');
        } else if (gameToJoin.passwordProtected) {
          return sendGameMessage('Please provide a password');
        }
        //TODO: add the user in the room to the as a player in the game
        //socket.join(String(roomKey)); //is this even nessesary?
        currentRoomId = roomKey; //what is this used for?
        const player = {
          name: senderID,
          cards: 0,
          score: 0,
          uno: false
        };
        
        //TODO
        broadcastAllGameMessage({type: "playerJoin", payload: {player: player}})
        //io.to(String(roomId)).emit('playerJoin', player); //broadcast message + payload
        gameToJoin.playerCount += 1;
        gameToJoin.players.push({ ...player, cards: [] });
        const { hostSocket, ...gameInfo } = gameToJoin; //what does this do?
        //sendGameMessage back
        sendGameMessage({type: "joinedGame", payload: {
            ...gameInfo,
            isHost: false
          }
        })
        /*
        socket.emit('joinedGame', {
          ...gameInfo,
          isHost: false
        });
        */
        return sendAvailableGames(currentGames, sendGameMessage);
      }
      return sendGameMessage('This game does not exist');
      break;

    case "playCard": //socket.on('playCard', ({ cardIndex, colorIndex }) => {
      const cardIndex = payload.payload.cardIndex;
      const colorIndex = payload.payload.colorIndex;
      const currentGame = currentGames[roomKey];
      let { currentCard, players } = currentGame;
      const player = isPlayerTurn(currentGame, senderID);
      const playerIdx = currentGame.currentPlayerTurnIndex;
      if (!player) {
        return sendGameMessage('Error playing card');
      }

      const cardToPlay = player.cards[cardIndex];

      if (!cardToPlay) {
        return sendMessage('Card does not exist');
      }

      const playCard = card => {
        currentGame.currentPlayerTurnIndex = updateCurrentPlayerTurnIndex(
          currentGame
        );
        if (currentGame.restrictDraw) currentGame.restrictDraw = false;

        if (player.cards.length === 1) {
          if (!player.uno) {
            const randomCards = [];
            for (let i = 0; i < 2; i++) {
              randomCards.push(generateRandomCard());
            }
            currentGame.players[playerIdx].cards = [
              ...currentGame.players[playerIdx].cards,
              ...randomCards
            ];
            //TODO send game message
            sendGameMessage({type: "disableUnoButton"})
            sendGameMessage({type: "drawnCard", payload: {
              playerIdx,
              randomCards
            }})
            /*
            socket.emit('disableUnoButton');
            socket.emit('drawnCard', {
              playerIdx,
              randomCards
            });
            */
            
            //TODO broadcast

            broadcastAllGameMessage({type: "drawnCard", payload:{
              playerIdx,
              numCards: randomCards.length
            }})
            /*
            socket.to(currentRoomId).emit('drawnCard', {
              playerIdx,
              numCards: randomCards.length
            });
            */
          } else {
            const playersWithCardsLeft = currentGame.players.filter(
              player => player.cards.length > 0
            ).length;

            if (playersWithCardsLeft === 2) {
              const finishedGame = finishGame(currentGames, roomKey);
              currentGames[currentRoomId] = {
                ...finishedGame,
                hostSocket: currentGame.hostSocket
              };

              sendAvailableGames(currentGames, sendGameMessage);
              //todo broadcast
              sendGameMessage({type: "gameFinished", payload: {
                ...finishedGame,
                isHost: true
              }})
              broadcastAllGameMessage({type: "gameFinished", payload: { finishedGame}})

              /*
              io.to(currentRoomId).clients((err, clients) => {
                if (err) throw new Error(err);

                return clients.forEach(client => {
                  const clientSocket = io.sockets.sockets[client];
                  clientSocket.id === currentGame.hostSocket
                    ? clientSocket.emit('gameFinished', {
                        ...finishedGame,
                        isHost: true
                      })
                    : io.to(currentRoomId).emit('gameFinished', finishedGame);
                });
              });
              */

            }
          }
          currentGame.players[playerIdx].uno = false;
        }

        currentGame.currentCard = card;
        console.log(`${senderID} played ${JSON.stringify(card)}`);
        players.find(player => {
          player.name === senderID && player.cards.splice(cardIndex, 1);
        });

        //TODO broadcast
        broadcastAllGameMessage({type: "cardPlayed", payload: {
          cardPlayerIndex: playerIdx,
          cardIndex,
          currentPlayerTurnIndex: currentGame.currentPlayerTurnIndex,
          currentCard: card
        }})
        /*
        io.in(currentRoomId).emit('cardPlayed', {
          cardPlayerIndex: playerIdx,
          cardIndex,
          currentPlayerTurnIndex: currentGame.currentPlayerTurnIndex,
          currentCard: card
        });
        */
        if (player.cards.length === 1) {
          sendGameMessage({type: "unoButton"})
          //socket.emit('unoButton');
        }
      };

      if (canPlayCard(cardToPlay, currentCard)) {
        const cardType = cardToPlay.type;
        switch (cardType) {
          case 'reverse':
          case 'skip': {
            if (cardType === 'reverse' && currentGame.players.length > 2) {
              currentGame.turnReverse = !currentGame.turnReverse;
            } else {
              currentGame.currentPlayerTurnIndex = updateCurrentPlayerTurnIndex(
                currentGame
              );
            }
            break;
          }
          case '+4':
          case '+2': {
            const playerToDrawIndex = updateCurrentPlayerTurnIndex(currentGame);
            const playerToDrawUsername = players[playerToDrawIndex].name;
            const randomCards = [];
            currentGame.currentPlayerTurnIndex = updateCurrentPlayerTurnIndex(
              currentGame
            );
            let cardsToGenerate = 2;

            if (cardType === '+4') {
              cardToPlay.color = colors[colorIndex];
              cardsToGenerate = 4;
            }

            for (let i = 0; i < cardsToGenerate; i++) {
              randomCards.push(generateRandomCard());
            }
            players[playerToDrawIndex].cards = [
              ...players[playerToDrawIndex].cards,
              ...randomCards
            ];

            for (const [userID] of Object.entries(currentRoom)) {
              if (userID === playerToDrawUsername) {
                //The next player (who is not the sender) have to draw
                sendGameMessageTo({type: 'drawnCard', payload: {
                  playerIdx: playerToDrawIndex,
                  randomCards
                }}, userID)
                /*
                clientSocket.emit('drawnCard', {
                  playerIdx: playerToDrawIndex,
                  randomCards
                });
                */
              } else {
                //The rest of the players are informed that the other player has to draw
                sendGameMessageTo({type: "drawnCard", payload: {
                  playerIdx: playerToDrawIndex,
                  numCards: randomCards.length
                }}, userID)
              } 
              /*
              clientSocket.emit('drawnCard', {
                playerIdx: playerToDrawIndex,
                numCards: randomCards.length
              });
              */
            }
            break;
          }
          case 'wild': {
            cardToPlay.color = colors[colorIndex];
          }
        }
        playCard(cardToPlay);
      }
      break;

    case "requestCard":
      let currentGameRC = currentGames[roomKey];
      let currentCardRC = currentGameRC.currentCard;
      let restrictDrawRC = currentGameRC.restrictDraw;
      //const{ currentCard, restrictDraw } = currentGame;
      let playerRC = isPlayerTurn(currentGameRC, senderID);
      let playerIdxRC = currentGameRC.currentPlayerTurnIndex;
  
      if (!playerRC || restrictDrawRC) {
        return sendGameMessage('Error drawing card');
      }
      playerRC.uno
        ? (currentGameRC.players[playerIdxRC].uno = false)
        : sendGameMessage({type: "disableUnoButton"}); //socket.emit('disableUnoButton');
  
      const randomCard = generateRandomCard();
      if (!canPlayCard(randomCard, currentCardRC)) {
        currentGameRC.currentPlayerTurnIndex = updateCurrentPlayerTurnIndex(
          currentGameRC
        );
      } else {
        currentGameRC.restrictDraw = true;
      }
  
      currentGameRC.players[playerIdxRC].cards.push(randomCard);
      sendGameMessage({type:'drawnCard', payload: {
        playerIdx: playerIdxRC,
        randomCards: [randomCard]
      }})
      broadcastGameMessage({type:'drawnCard', payload: { playerIdx: playerIdxRC, numCards: 1 }})
      /*
      socket.emit('drawnCard', {
        playerIdx,
        randomCards: [randomCard]
      });
      socket
        .to(String(currentRoomId))
        .emit('drawnCard', { playerIdx, numCards: 1 });
      */
      break;

    case "callUno":
      const currentGameCU = currentGames[roomKey];
      const playerIdxCU = currentGameCU.players.findIndex(
        player => player.name === senderID
      );
      const playerCU = currentGameCU.players[playerIdxCU];
      if (playerCU && playerCU.cards.length === 1 && !playerCU.uno) {
        currentGames[roomKey].players[playerIdxCU].uno = true;
        sendGameMessage({type: "unoCalled", payload:{ playerIdx: playerIdxCU, senderID }})
        //socket.emit('unoCalled', { playerIdx, senderID });
        //console.log(senderID, 'called uno!');
      } else {
        sendMessage('You are not able to call uno at this time');
      } 
      break;

    //remove this one??
    case "leaveRoom":
      
      break;

    default:
      console.log("default triggerd in switch, payload:", payload);
  }
  //leave room constant / function below

  /*
  socket.on('createGame', ({ maxPlayers, name }) => {
    if (!maxPlayers || !name)
      return sendMessage('Please provide all the info needed', true, socket);
    const roomId = uniqid();
    const game = new Game(maxPlayers, name, roomId, username);
    currentRoomId = roomId;

    currentGames[roomId] = {
      ...game,
      hostSocket: socket.id
    };
    socket.join(`${roomId}`);
    currentRoomId = roomId;

    socket.emit('gameCreated', {
      ...game,
      isHost: true
    });
    sendAvailableGames(currentGames);
  });

  socket.on('startGame', roomId => {
    if (
      currentGames[roomId] &&
      currentGames[roomId].hostSocket === String(socket.id) &&
      currentGames[roomId].playerCount > 1
    ) {
      const gameToStart = currentGames[roomId];
      gameToStart.inLobby = false;
      sendAvailableGames(currentGames);

      gameToStart.players.forEach((player, idx) => {
        for (let i = 0; i < 7; i++) {
          gameToStart.players[idx].cards.push(generateRandomCard());
        }
      });

      return io.to(roomId).clients((err, clients) => {
        clients.forEach(client => {
          const clientSocket = io.sockets.sockets[client];
          const players = sanitizePlayer(
            gameToStart,
            clientSocket.handshake.query.username
          );
          clientSocket.emit('initGame', players);
        });

        const currentCard = generateRandomCard();
        gameToStart.currentCard = currentCard;
        io.to(roomId).emit('currentCard', currentCard);
      });
    }
    return sendMessage('Could not start game', true, socket);
  });

  socket.on('joinGame', ({ roomId }) => {
    if (currentGames[roomId]) {
      const gameToJoin = currentGames[roomId];
      if (gameToJoin.playerCount === gameToJoin.maxPlayers) {
        return sendMessage(
          'The game you are trying to join is full',
          true,
          socket
        );
      } else if (gameToJoin.passwordProtected) {
        return sendMessage('Please provide a password', true, socket);
      }
      socket.join(String(roomId));
      currentRoomId = roomId;
      const player = {
        name: username,
        cards: 0,
        score: 0,
        uno: false
      };

      io.to(String(roomId)).emit('playerJoin', player);
      gameToJoin.playerCount += 1;
      gameToJoin.players.push({ ...player, cards: [] });
      const { hostSocket, ...gameInfo } = gameToJoin;
      socket.emit('joinedGame', {
        ...gameInfo,
        isHost: false
      });

      return sendAvailableGames(currentGames);
    }
    return sendMessage('This game does not exist', true, socket);
  });

  socket.on('playCard', ({ cardIndex, colorIndex }) => {
    const currentGame = currentGames[currentRoomId];
    let { currentCard, players } = currentGame;
    const player = isPlayerTurn(currentGame, username);
    const playerIdx = currentGame.currentPlayerTurnIndex;
    if (!player) {
      return sendMessage('Error playing card', true, socket);
    }

    const cardToPlay = player.cards[cardIndex];

    if (!cardToPlay) {
      return sendMessage('Card does not exist', true, socket);
    }

    const playCard = card => {
      currentGame.currentPlayerTurnIndex = updateCurrentPlayerTurnIndex(
        currentGame
      );
      if (currentGame.restrictDraw) currentGame.restrictDraw = false;

      if (player.cards.length === 1) {
        if (!player.uno) {
          const randomCards = [];
          for (let i = 0; i < 2; i++) {
            randomCards.push(generateRandomCard());
          }
          currentGame.players[playerIdx].cards = [
            ...currentGame.players[playerIdx].cards,
            ...randomCards
          ];
          socket.emit('disableUnoButton');
          socket.emit('drawnCard', {
            playerIdx,
            randomCards
          });
          socket.to(currentRoomId).emit('drawnCard', {
            playerIdx,
            numCards: randomCards.length
          });
        } else {
          const playersWithCardsLeft = currentGame.players.filter(
            player => player.cards.length > 0
          ).length;

          if (playersWithCardsLeft === 2) {
            const finishedGame = finishGame(currentGames, currentRoomId);
            currentGames[currentRoomId] = {
              ...finishedGame,
              hostSocket: currentGame.hostSocket
            };

            sendAvailableGames(currentGames);
            io.to(currentRoomId).clients((err, clients) => {
              if (err) throw new Error(err);

              return clients.forEach(client => {
                const clientSocket = io.sockets.sockets[client];
                clientSocket.id === currentGame.hostSocket
                  ? clientSocket.emit('gameFinished', {
                      ...finishedGame,
                      isHost: true
                    })
                  : io.to(currentRoomId).emit('gameFinished', finishedGame);
              });
            });
          }
        }
        currentGame.players[playerIdx].uno = false;
      }

      currentGame.currentCard = card;
      console.log(`${username} played ${JSON.stringify(card)}`);
      players.find(player => {
        player.name === username && player.cards.splice(cardIndex, 1);
      });

      io.in(currentRoomId).emit('cardPlayed', {
        cardPlayerIndex: playerIdx,
        cardIndex,
        currentPlayerTurnIndex: currentGame.currentPlayerTurnIndex,
        currentCard: card
      });
      if (player.cards.length === 1) {
        socket.emit('unoButton');
      }
    };

    if (canPlayCard(cardToPlay, currentCard)) {
      const cardType = cardToPlay.type;
      switch (cardType) {
        case 'reverse':
        case 'skip': {
          if (cardType === 'reverse' && currentGame.players.length > 2) {
            currentGame.turnReverse = !currentGame.turnReverse;
          } else {
            currentGame.currentPlayerTurnIndex = updateCurrentPlayerTurnIndex(
              currentGame
            );
          }
          break;
        }
        case '+4':
        case '+2': {
          const playerToDrawIndex = updateCurrentPlayerTurnIndex(currentGame);
          const playerToDrawUsername = players[playerToDrawIndex].name;
          const randomCards = [];
          currentGame.currentPlayerTurnIndex = updateCurrentPlayerTurnIndex(
            currentGame
          );
          let cardsToGenerate = 2;

          if (cardType === '+4') {
            cardToPlay.color = colors[colorIndex];
            cardsToGenerate = 4;
          }

          for (let i = 0; i < cardsToGenerate; i++) {
            randomCards.push(generateRandomCard());
          }
          players[playerToDrawIndex].cards = [
            ...players[playerToDrawIndex].cards,
            ...randomCards
          ];
          io.to(currentRoomId).clients((err, clients) => {
            clients.forEach(client => {
              const clientSocket = io.sockets.sockets[client];
              if (
                clientSocket.handshake.query.username === playerToDrawUsername
              ) {
                return clientSocket.emit('drawnCard', {
                  playerIdx: playerToDrawIndex,
                  randomCards
                });
              }
              return clientSocket.emit('drawnCard', {
                playerIdx: playerToDrawIndex,
                numCards: randomCards.length
              });
            });
          });
          break;
        }
        case 'wild': {
          cardToPlay.color = colors[colorIndex];
        }
      }
      playCard(cardToPlay);
    }
  });

  socket.on('requestCard', () => {
    const currentGame = currentGames[currentRoomId];
    let { currentCard, restrictDraw } = currentGame;
    const player = isPlayerTurn(currentGame, username);
    const playerIdx = currentGame.currentPlayerTurnIndex;

    if (!player || restrictDraw) {
      return sendMessage('Error drawing card', true, socket);
    }
    player.uno
      ? (currentGame.players[playerIdx].uno = false)
      : socket.emit('disableUnoButton');

    const randomCard = generateRandomCard();
    if (!canPlayCard(randomCard, currentCard)) {
      currentGame.currentPlayerTurnIndex = updateCurrentPlayerTurnIndex(
        currentGame
      );
    } else {
      currentGame.restrictDraw = true;
    }

    currentGame.players[playerIdx].cards.push(randomCard);
    socket.emit('drawnCard', {
      playerIdx,
      randomCards: [randomCard]
    });
    socket
      .to(String(currentRoomId))
      .emit('drawnCard', { playerIdx, numCards: 1 });
  });

  socket.on('callUno', () => {
    const currentGame = currentGames[currentRoomId];
    const playerIdx = currentGame.players.findIndex(
      player => player.name === username
    );
    const player = currentGame.players[playerIdx];
    if (player && player.cards.length === 1 && !player.uno) {
      currentGames[currentRoomId].players[playerIdx].uno = true;
      socket.emit('unoCalled', { playerIdx, username });
      console.log(username, 'called uno!');
    } else {
      sendMessage('You are not able to call uno at this time', true, socket);
    }
  });

  const leaveRoom = roomId => {
    if (currentGames[roomId]) {
      const currentGame = currentGames[roomId];
      const players = currentGame.players;
      let playerIdx = players.findIndex(player => player.name === username);
      if (playerIdx !== undefined) {
        currentGames[roomId].players.splice(playerIdx, 1);
        currentGames[roomId].playerCount = currentGame.players.length;

        socket.leave(roomId, err => {
          if (err) throw new Error(err);
          console.log('player left room ', roomId);
        });
        currentRoomId = undefined;

        new Promise(resolve => {
          if (currentGame.hostSocket === socket.id && players.length > 0) {
            const randomPlayer = Math.floor(
              Math.random() * (currentGame.players.length - 1)
            );

            io.to(roomId).clients((err, clients) => {
              if (err) throw new Error(err);
              const newHostSocket = io.sockets.sockets[clients[randomPlayer]];
              const newHostName = newHostSocket.handshake.query.username;

              currentGame.hostSocket = newHostSocket.id;
              currentGame.host = newHostName;
              currentGames[roomId] = currentGame;
              newHostSocket.emit('newHost', newHostName);
            });
          }
          resolve();
        }).then(() => {
          if (!currentGame.inLobby) {
            if (players.length === 1) {
              const finishedGame = finishGame(currentGames, roomId);
              currentGames[roomId] = {
                ...finishedGame,
                hostSocket: currentGame.hostSocket
              };
              sendAvailableGames(currentGames);
              return io
                .to(roomId)
                .emit('gameFinished', { ...finishedGame, isHost: true });
            }

            let playerTurnIndex = currentGame.currentPlayerTurnIndex;
            if (
              playerTurnIndex === playerIdx &&
              currentGame.players.length === playerTurnIndex
            ) {
              currentGame.currentPlayerTurnIndex = updateCurrentPlayerTurnIndex(
                currentGame
              );
            }
          } else if (players.length === 0) {
            delete currentGames[roomId];
            return sendAvailableGames(currentGames);
          }

          sendAvailableGames(currentGames);
          io.to(roomId).emit('playerLeave', playerIdx);
        });
      }
    }
  };

  socket.on('leaveRoom', () => {
    leaveRoom(currentRoomId);
  });

  socket.on('disconnect', async reason => {
    console.log(`Socket disconnected: ${reason}`);
    leaveRoom(currentRoomId);
    await User.deleteOne({ username: username }, err => {
      if (err) throw new Error(err);
    });
  });
  */
}

module.exports = gameLogic;
