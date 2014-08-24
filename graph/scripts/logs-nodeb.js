function a() { b(2) }
function b() { c(3) }
function c() { }
a(1);

function m(f) { f(2) }
function n() { p(3) }
function p() { }
m(b);



function x(l) { z(l) }
function y() { z(3) }
function z(e) { e() }
x(b);

x(function () {
	console.log()
});