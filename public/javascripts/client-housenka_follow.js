//Yelyzaveta Klysa
//some functions are from Milan Sorm https://is.stuba.sk/js/herna/housenka.js

window.onbeforeunload = function(){
	$.get('/session/destroy');
}
var kod;

const socket = new WebSocket('ws://localhost:8082');

$("#btn_follow").click(function (){
	kod=parseInt($("#code").val());
	$.get("/follow",{kod:kod},function(data){
		if(JSON.parse(data) === "ok"){
			console.log("ok");
			housenkaInit();
		}
	});
});

socket.addEventListener('message', function (event){
	var r = JSON.parse(event.data);
	plocha = r;
	nastavBarvu();
});


var canvas = document.getElementsByTagName('canvas')[0]
var ctx = canvas.getContext('2d');

function get_plocha () {
	socket.send('GET plocha '+JSON.parse(kod));
	rozpohybujHousenku();
}


//this is from Milan Sorm https://is.stuba.sk/js/herna/housenka.js ----------------------
var xsize = 41;
var ysize = 31;
var rychlost = 250;

var plocha = new Array();
var timer;

function rozpohybujHousenku () {
	if (timer) zastavHousenku();
	timer = setTimeout(get_plocha,rychlost);
}

function zastavHousenku () {
	if (timer) {
		clearTimeout(timer);
		timer = undefined;
	}
}

function reverse_coords (pozice) {
	var x = pozice % xsize;
	var y = Math.floor(pozice / xsize);

	return new Array (x,y);
}

function coords (x,y) {
	return y*xsize + x;
}
//----------------------------------------------------------------------------------------

var x = false;
function housenkaInit () {
	for (var y=0; y < ysize; y++) {
		for (var x=0; x < xsize; x++) {
			if(y>0 && y<ysize-1 && x>0 && x<xsize-1) {
				plocha[coords(x,y)] = 0;
			}
		}
	}	
	console.log("onload");
	rozpohybujHousenku();
	document.defaultAction = false;
}
function draw(x,y, color) {
	ctx.fillStyle = color;
	ctx.fillRect(x*34,y*34,33,33);
}

function nastavBarvu () {
	for(let i=0; i<plocha.length;i++){
		if (plocha[i] == 0){
			draw(reverse_coords(i)[0], reverse_coords(i)[1], 'white');
		} else if(plocha[i] == 1){
			draw(reverse_coords(i)[0], reverse_coords(i)[1], 'blue');
		}else if(plocha[i] == 2){
			draw(reverse_coords(i)[0], reverse_coords(i)[1], 'red'); //food
		}else if(plocha[i] == 3){
			draw(reverse_coords(i)[0], reverse_coords(i)[1], 'orange'); //wall
		}else if(plocha[i] == 4){
			draw(reverse_coords(i)[0], reverse_coords(i)[1], 'violet'); //key
		}else if(plocha[i] == 5){
			draw(reverse_coords(i)[0], reverse_coords(i)[1], 'black'); //door
		}else if(plocha[i] == 6){
			draw(reverse_coords(i)[0], reverse_coords(i)[1], 'green');
		}
	}
}