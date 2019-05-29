/*
* MESSAGE CODES
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
		
		console.log('room with id: ' + roomCounter + ' has been created by: ' + msg);
		socket.join(roomCounter);
		roomStatus[roomCounter] = 0;
		socket.emit('newRoom', roomCounter);
		roomCounter++;
    });
});

io.on('connection', function(socket){
	socket.on('turn', function(msg){
		var recvBufView = new Uint8Array(msg);

		var bufArr = new ArrayBuffer(2);
		var sendBufView = new Uint8Array(bufArr);

		sendBufView[0] = msg[1];
		sendBufView[1] = msg[2];

		var roomName = msg[0];
		
		console.log(sendBufView);
		console.log('move in room: ' + roomName + ' on position: ' + msg[1] + ' victory: ' + msg[2]);
		socket.broadcast.to(roomName).emit('turn', bufArr);
		if(msg[2] != 0){
			roomStatus[roomName] = 2;
			socket.leave(roomName);
		}
		
	});
});

io.on('connection', function(socket){
    socket.on('roomJoin', function(msg){

			var msg_split = msg.split(";");
			var roomName = msg_split[0];
			var player2 = msg_split[1];
			console.log(player2 + " attempts to connect " + roomName);
			var room = io.nsps['/'].adapter.rooms[roomName];

			if(!room){ 
				socket.emit('err', roomName + ' does not exist');
				console.log(roomName + " does not exist");
			}
			else if(roomStatus[roomName] != 0){ 
				socket.emit('err', roomName + ' is full');
				console.log(roomName + " is full");
			}
			else{
				roomStatus[roomName] = 1;
				console.log('user: ' + player2 + ' connecting to: ' + roomName);
				socket.join(roomName);
				socket.broadcast.to(roomName).emit('player1', player2);
				socket.emit('player2', roomName);
			}
		});
		
		io.on('connection', function(socket){
			socket.on('ackResult', function(msg){
				console.log('Leaving room ' + msg + '..');
				socket.leave(msg);
			});
	});

});