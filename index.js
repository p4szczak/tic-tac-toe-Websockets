/**
 * gameStatus 	-> 0 pending on enemy
 * 							-> 1 game in progress
 * 							-> 10 draw
 * 							-> 11 player1 won
 * 							-> 12 player2 won
 *  						
 * 						
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
* MESSAGE CODES
* //NIEAKTUALNE
* turn {roomId} {turnNumber} {gameStatus}
*	gameStatus: 0 -> game in progress
* gameStatus: 1 -> someone won
* gameStatus: 2 -> draw 
* 
* roomStatus:
* 0 -> pending for enemy
* 1 -> game in progress
* 2 -> game ended
*
*/

var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

class Game{
	constructor(roomId, player1Name,  player1Socket){
		this.roomId = roomId;
		this.table = [0,0,0,0,0,0,0,0,0];
		this.player1Name = player1Name;
		this.player1Socket = player1Socket;

		console.log('room with id: ' + roomId + ' has been created by: ' + player1Name);
		player1Socket.join(roomId);
		player1Socket.emit('newRoom', roomId);

		this.player2Name = null;
		this.player2Socket = null;

		this.gameStatus = 0;
		this.whoNow = 0;
		this.turnCounter = 0;
	}

	player2Join(_roomId, playerName, playerSocket){
		if(this.gameStatus != 0){ 
			playerSocket.emit('err', _roomId + ' is full');
			console.log(_roomId + " is full");
		}
		else{
			console.log('user: ' + playerName + ' connecting to: ' + _roomId);
			playerSocket.join(_roomId);
			playerSocket.broadcast.to(_roomId).emit('player1', playerName);
			playerSocket.emit('player2', _roomId);

			this.gameStatus = 1;
			this.player2Name = playerName;
			this.player2Socket = playerSocket;
			this.gameStatus = 1;
			this.whoNow = 1;
		}
	}

	makeTurn(position,playerCode){
		console.log("aaaa");
		if(playerCode != this.whoNow || this.table[position] != 0) return

		var bufArr = new ArrayBuffer(2);
		var sendBufView = new Uint8Array(bufArr);
		
		sendBufView[0] = position;
		sendBufView[1] = playerCode;
		
		console.log(sendBufView);
		console.log('move in room: ' + this.roomId + ' on position: ' + position + ' playerType: ' + playerCode);
		if(this.whoNow == 1){
			this.player1Socket.broadcast.to(this.roomId).emit('turn', bufArr);
			this.whoNow = 2;
		}
		else{
			this.player2Socket.broadcast.to(this.roomId).emit('turn', bufArr);
			this.whoNow = 1;
		}
		//TUTAJ PROBLEM
	}

	checkVictory(){
		if (this.turnCounter >= 9) return 2;
			//vertical
		else if(table[0] == table[3] && table[0] == table[6] && table[0] != 0) return 1;
		else if(table[1] == table[4] && table[1] == table[7] && table[1] != 0) return 1;
		else if(table[2] == table[5] && table[2] == table[8] && table[2] != 0) return 1;
		//horizontal
		else if(table[0] == table[1] && table[0] == table[2] && table[0] != 0) return 1;
		else if(table[3] == table[4] && table[4] == table[5] && table[3] != 0) return 1;
		else if(table[6] == table[7] && table[6] == table[8] && table[6] != 0) return 1;
		//cross
		else if(table[0] == table[4] && table[0] == table[8] && table[0] != 0) return 1;
		else if(table[2] == table[4] && table[2] == table[6] && table[2] != 0) return 1;
		
		else return 0;
	}
}


var roomCounter = 0;
var roomStatus = [];

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
    console.log('a user connected');
});


http.listen(3000, function(){
  console.log('listening on *:3000');
});

io.on('connection', function(socket){
    socket.on('roomCreation', function(msg){
			roomStatus[roomCounter] = new Game(roomCounter, msg, socket);
			roomCounter++;
    });
});

io.on('connection', function(socket){
	socket.on('roomJoin', function(msg){

		var msg_split = msg.split(";");
		var roomId = msg_split[0];
		var player2 = msg_split[1];
		console.log(player2 + " attempts to connect " + roomId);

		var room = io.nsps['/'].adapter.rooms[roomId];

		if(!room){ 
			socket.emit('err', roomId + ' does not exist');
			console.log(roomId + " does not exist");
		}
		else{
			roomStatus[roomId].player2Join(roomId,player2, socket)
		}
	});
});

io.on('connection', function(socket){
	socket.on('turn', function(msg){

		var roomId = msg[0];
		roomStatus[roomId].makeTurn(msg[1], msg[2]);
		// var bufArr = new ArrayBuffer(2);
		// var sendBufView = new Uint8Array(bufArr);
		
		// sendBufView[0] = msg[1];
		// sendBufView[1] = msg[2];

		
		
		// console.log(sendBufView);
		// console.log('move in room: ' + roomId + ' on position: ' + msg[1] + ' playerType: ' + msg[2]);
		// socket.broadcast.to(roomId).emit('turn', bufArr);
		// if(msg[2] != 0){
		// 	roomStatus[roomId] = 2;
		// 	socket.leave(roomId);
		// 	io.of('/').in(roomId).clients((error, clients) => {
		// 		if (error) throw error;
		// 		console.log(clients); // => [Anw2LatarvGVVXEIAAAD]
		// 	});
		// }
		
	});
});

// io.on('connection', function(socket){
// 	socket.on('ackResult', function(msg){
// 		console.log('Leaving room ' + msg + '..');
// 		socket.leave(msg);
// 	});
// });
