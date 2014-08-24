function getData (args, cb) {
    if (!args) { return cb(new Error('args required')); }
    else { return cb(new Error('args required')); }
    //if (!args.id) { return cb(new Error('args.id required')); }

   	setTimeout(cb,100);
}

render = function (params) {
	console.log(params);
}

getData(null,render);
getData('students', render);