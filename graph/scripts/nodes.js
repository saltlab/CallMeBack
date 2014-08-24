function a(alpha, beta) {
	function b(f) {}
	b(beta)
	alpha();
	return function c() {};
}
a();
a(function () { });

var x = { y: function () { } };
x.y(function () { });
