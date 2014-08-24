//Example code

function sally() { return true}

sally.prototype.jim = function (){
   bert();
};
	
sally.prototype.sam = function (){
   this.jim();
};
	
var bert = function () {
   bert();
};
	
function jane() {
   if ( sally() ){
      sally.jim();
   }
}

jane()