var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var roomCounter = 0;

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
		var roomName = "room-" + roomCounter;
		roomCounter++;
		console.log('room: ' + roomName + ' has been created by: ' + msg);
		socket.join(roomName);
		socket.emit('newRoom', roomName);
    });
});

io.on('connection', function(socket){
	socket.on('turn', function(msg){
		var msg_split = msg.split(";");
		var roomName = msg_split[0];
		var move = msg_split[1];
		console.log('move in room: ' + roomName + 'on position: ' + move);
		socket.broadcast.to(roomName).emit('turn', move);
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
			else if(room.length > 1){ 
				socket.emit('err', roomName + ' is full');
				console.log(roomName + " is full");
			}
			else{
				console.log('user: ' + player2 + ' connecting to: ' + roomName);
				socket.join(roomName);
				socket.broadcast.to(roomName).emit('player1', player2);
				socket.emit('player2', roomName);
			}
    });
});