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

var errorCodes = {'NO_ROOM_FOUND': 1, 'GAME_IN_PROGRESS': 2}; 
var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

function uint8arrayToStringMethod(myUint8Arr){
	return String.fromCharCode.apply(null, myUint8Arr);
}

function StringToUint8arrayMethod(str) {
	var buf = new ArrayBuffer(str.length); // 2 bytes for each char
	var bufView = new Uint8Array(buf);
	for (var i=0, strLen=str.length; i < strLen; i++) {
	  bufView[i] = str.charCodeAt(i);
	}
	return buf;
  }

class Game{
	constructor(roomId, player1Name,  player1Socket){
		this.roomId = roomId;
		this.table = [0,0,0,0,0,0,0,0,0];
		this.player1Name = player1Name;
		this.player1Socket = player1Socket;

		console.log('room with id: ' + roomId + ' has been created by: ' + player1Name);
		player1Socket.join(roomId);
		var bufArr = new ArrayBuffer(1);
		var bufView = new Uint8Array(bufArr);
		bufView[0] = roomId;
		player1Socket.emit('newRoom', bufArr);

		this.player2Name = null;
		this.player2Socket = null;

		this.gameStatus = 0;
		this.whoNow = 0;
		this.turnCounter = 0;
	}

	player2Join(_roomId, playerName, playerSocket){
		if(this.gameStatus != 0){ 
			var bufArrErr = new ArrayBuffer(2);
			var bufViewErr = new Uint8Array(bufArrErr);
			bufViewErr[0] = errorCodes['GAME_IN_PROGRESS'];
			bufViewErr[1] = _roomId;
			playerSocket.emit('err', bufArrErr);
			console.log(_roomId + " is full");
		}
		else{
			console.log('user: ' + playerName + ' connecting to: ' + _roomId);
			playerSocket.join(_roomId);
			//send information to player1

			var encodedPlayer2Name = StringToUint8arrayMethod(playerName);
			var bufArrPlayer2Name = new ArrayBuffer(Object(encodedPlayer2Name).length);
			var bufViewPlayer2Name = new Uint8Array(bufArrPlayer2Name);
			bufViewPlayer2Name = encodedPlayer2Name;
			console.log(encodedPlayer2Name);
			playerSocket.broadcast.to(_roomId).emit('player1', bufViewPlayer2Name);

			//resend room id to user who tries to connect
			var bufArrRoomId = new ArrayBuffer(1);
			var bufViewRoomId = new Uint8Array(bufArrRoomId);
			bufViewRoomId[0] = _roomId;
			playerSocket.emit('player2', bufArrRoomId);

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

		//sprawdzamy czy nie oszukuje
		if(playerCode != this.whoNow || this.table[position] != 0) return

		var bufArr = new ArrayBuffer(3);
		var sendBufView = new Uint8Array(bufArr);
		
		sendBufView[0] = position;
		sendBufView[1] = playerCode;
		console.log(sendBufView);
		console.log('move in room: ' + this.roomId + ' on position: ' + position + ' playerType: ' + playerCode);
		this.table[position] = this.whoNow;
		this.turnCounter++
		var cv = this.checkVictory(this.whoNow);
		console.log('cv: '+ cv);
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
			var creatorName = uint8arrayToStringMethod(Object.values(msg));
			roomStatus[roomCounter] = new Game(roomCounter, creatorName, socket);
			roomCounter++;
    });
});

io.on('connection', function(socket){
	socket.on('roomJoin', function(msg){
		var recvMessage = uint8arrayToStringMethod(Object.values(msg));
		var msg_split = recvMessage.split(";");
		var roomId = msg_split[0];
		var player2 = msg_split[1];
		console.log(player2 + " attempts to connect " + roomId);

		var room = io.nsps['/'].adapter.rooms[roomId];

		if(!room){
			var bufArrErr = new ArrayBuffer(2);
			var bufViewErr = new Uint8Array(bufArrErr);
			bufViewErr[0] = errorCodes['NO_ROOM_FOUND'];
			bufViewErr[1] = roomId;
			socket.emit('err',bufArrErr);
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
