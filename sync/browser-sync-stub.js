var socket = io.connect('http://localhost');
  socket.on('server-clock', function (data) {
    console.log(data);
    __tracer.clock['server'] = data; 
    socket.emit('client-clock', __tracer.clock['client']);
  });