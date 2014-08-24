function getData (args, cb) {
	cb('something happened');
	setTimeout(cb,100);
}

render = function (params) {
	console.log(params);
}

getData(null,render);
getData('students', render);