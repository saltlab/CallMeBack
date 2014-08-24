function callx(f) {
	f();
}

function a() {
	callx(function () {
		b();
	});
}
function b() {
	console.log('');
}

a();


/*read_something(name, cb) {
    fs.readFile(name, 'utf8', function(err, result) {
        if (err) cb(err);
        result = foo(bar(result));
        //cb(null, result);
        b(cb);
    });
});*/


