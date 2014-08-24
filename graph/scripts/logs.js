function foo(a) {
	bar(a + 1);
}
function bar(b) {
}

setTimeout(function timeout() { bar(3); }, 100)
foo(1, 'unnamed');
