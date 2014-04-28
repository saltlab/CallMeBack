var app = require('express')()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server);

server.listen(7676);

io.sockets.on('connection', function (socket) {
  socket.emit('server-clock', __tracer.clock['server']);
  socket.on('client-clock', function (data) {
    console.log(data);
    __tracer.clock['client'] = data; 
  });
});