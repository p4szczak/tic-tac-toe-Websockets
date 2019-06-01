/**
 * gameStatus	-> 0 pending on enemy
 * 				-> 1 game in progress
 * 				-> 11 player1 won
 * 				-> 12 player2 won
 * 				-> 13 draw
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

	checkVictory(id){
		//vertical
		if(this.table[0] == this.table[3] && this.table[0] == this.table[6] && this.table[0] != 0) return id;
		else if(this.table[1] == this.table[4] && this.table[1] == this.table[7] && this.table[1] != 0) return id;
		else if(this.table[2] == this.table[5] && this.table[2] == this.table[8] && this.table[2] != 0) return id;
		//horizontal
		else if(this.table[0] == this.table[1] && this.table[0] == this.table[2] && this.table[0] != 0) return id;
		else if(this.table[3] == this.table[4] && this.table[4] == this.table[5] && this.table[3] != 0) return id;
		else if(this.table[6] == this.table[7] && this.table[6] == this.table[8] && this.table[6] != 0) return id;
		//cross
		else if(this.table[0] == this.table[4] && this.table[0] == this.table[8] && this.table[0] != 0) return id;
		else if(this.table[2] == this.table[4] && this.table[2] == this.table[6] && this.table[2] != 0) return id;
		else if (this.turnCounter >= 9) return 3;
		
		else return 0;
	}

	makeTurn(position, playerCode){

		if(playerCode != this.whoNow || this.table[position] != 0) return

		var bufArr = new ArrayBuffer(3);
		var sendBufView = new Uint8Array(bufArr);
		
		sendBufView[0] = position;
		sendBufView[1] = playerCode;
		console.log(sendBufView);
		console.log('move in room: ' + this.roomId + ' on position: ' + position + ' playerType: ' + playerCode);
		this.table[position] = this.whoNow
		var cv = this.checkVictory(this.whoNow);
		sendBufView[2] = cv;
		console.log(this.table)
		if(this.whoNow == 1){
			this.player1Socket.broadcast.to(this.roomId).emit('turn', bufArr);
			this.whoNow = 2;	
			this.player1Socket.emit('end', bufArr);
		}
		else{
			this.player2Socket.broadcast.to(this.roomId).emit('turn', bufArr);
			this.whoNow = 1;
			this.player2Socket.emit('end', bufArr);
		}
		if(cv != 0){
			this.player2Socket.leave(this.roomId);
			this.player1Socket.leave(this.roomId);
			this.gameStatus = cv + 10;
		}
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
		
	});
});
