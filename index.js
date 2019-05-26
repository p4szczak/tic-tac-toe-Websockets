var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

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
		roomName = "room-1"
    	console.log('room has been created by: ' + msg);
		socket.join(roomName);
		socket.emit('newRoom', roomName);
    });
});

io.on('connection', function(socket){
    socket.on('roomJoin', function(msg){
		var msg_split = msg.split(";");
		var roomName = msg_split[0];
		var player2 = msg_split[1];
    	console.log('user: ' + player2 + ' connecting to: ' + roomName);
		socket.join(roomName);
		socket.broadcast.to(roomName).emit('player1', player2);
    });
});