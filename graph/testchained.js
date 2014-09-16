var graphlib = require("graphlib");
var dot = require("graphlib-dot");

var g = new dot.DotDigraph();
var parent;
for (var i=0; i<5; i++){
	id = g.addNode('cluster'+i,{ label: i });
	if (i!=0)
	{
		g.parent(id, parent);
	}
	parent=id;

}

for (var i=6; i<10; i++){
	id = g.addNode('cluster'+i,{ label: i });
	if (i==6){
		g.parent(id, 'cluster2');
	} else {
		g.parent(id, parent);
	}
	parent=id;

}

console.log(dot.write(g));