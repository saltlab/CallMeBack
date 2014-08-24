function a() { b() }
function b() { console.log(1) }
a();
setTimeout(a, 100);
