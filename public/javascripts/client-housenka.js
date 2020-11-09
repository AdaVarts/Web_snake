//Yelyzaveta Klysa
//some functions are from Milan Sorm https://is.stuba.sk/js/herna/housenka.js

window.onbeforeunload = function(){
	$.get('/session/destroy');
}
var kod;

const socket = new WebSocket('ws://localhost:8082');

socket.addEventListener('message', function (event){
	var r = JSON.parse(event.data);
	plocha = r;
	nastavBarvu();
	console.log(plocha);
	$.get("/score",{kod:kod},function(data){
		$("#score").html(JSON.parse(data)); 
	});
	$.get("/max_score",{kod:kod}, function(data){
		$("#max_score").html(JSON.parse(data)); 
	});
	$.get("/level",{kod:kod},function(data){
		$("#level").html(JSON.parse(data)); 
	});
	$.get("/max_level",{kod:kod}, function(data){
		$("#max_level").html(JSON.parse(data)); 
	});	
});

$("#btn_save").click(function (){
	let csvContent = "data:text/csv;charset=utf-8,";
	csvContent += plocha + "\r\n";
	csvContent += document.getElementById("score").innerText + "\r\n";
	csvContent += document.getElementById("level").innerText + "\r\n";

	var encodedUri = encodeURI(csvContent);
	var link = document.createElement("a");
	link.setAttribute("href", encodedUri);
	link.setAttribute("download", "plocha.csv");
	link.click();
});
 
$("#btn_upload").click(function (){
	const file = document.getElementById('file').files[0];
	const reader = new FileReader;
	reader.addEventListener('load', () => {
	   	console.log(reader.result);
	   	var allRows = reader.result.split(/\r?\n|\r/);
	   	allRows.length--;
		console.log(allRows[0]);
		var arr = [];
      	for(let singleRow in allRows[0].split(',')){
        	arr.push(parseInt(allRows[0].split(',')[singleRow]));
		}
		console.log(arr);  
		for(let i=0; i<arr.length; i++){
			if(arr[i]===1 || arr[i]===6){ arr[i] = 0; }
		}
		arr[coords(20,15)] = 6;
		arr[coords(19,15)] = 1;
	   	//2 - food, 3 - wall, 4 - key, 5 - door
	   	var food = new Array(), wall = new Array(), key = new Array(), door = new Array();
	   	for(let i=0; i<arr.length; i++){
			if(arr[i]===2){ food.push(i); }
			else if(arr[i]===3) { wall.push(i); }
			else if(arr[i]===4) { key.push(i); }
			else if(arr[i]===5) { door.push(i); }
		}
		plocha = arr;
		nastavBarvu();
	   	console.log(wall);
	   	for(i=0; i<wall.length; i++){
			console.log(reverse_coords(wall[i]));
		}
	   	$.get('/upload_map',{kod:kod, food:food, wall:wall, key:key, door:door}, function(data){
	   
	   	});
	});
	reader.readAsText(file, 'UTF-8');
	
});

var canvas = document.getElementsByTagName('canvas')[0]
var ctx = canvas.getContext('2d');

//this is from Milan Sorm https://is.stuba.sk/js/herna/housenka.js ----------------------
// some functions may be changed --------------------------------------------------------
housenkaInit();
var xsize = 41;
var ysize = 31;
var rychlost = 250;
var zrychleni = 0.8;
var off = false;
var startuj_hru = 1;

var plocha = new Array();
var klavesy = new Array();
var smer;		// 0 vpravo, pak po smeru
var timer;

var smery = new Array (1,0,0,1,-1,0,0,-1);
var idx_smeru = new Array (0,2,4,6);

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

function get_plocha () {
	socket.send('GET plocha '+JSON.parse(kod));
	if (!off) rozpohybujHousenku();
}
//---------------------------------------------------------------------------------------

var x = false;
function housenkaInit () {
	$.get("/get_code",function(data){
		kod = JSON.parse(data);
		document.getElementById("kod").innerText="kod: "+kod;
	});
	$.get("/get_pin",function(data){
		document.getElementById("pin").innerText="pin: "+JSON.parse(data);
	});
	for (var y=0; y < ysize; y++) {
		for (var x=0; x < xsize; x++) {
			if(y>0 && y<ysize-1 && x>0 && x<xsize-1) {
				plocha[coords(x,y)] = 0;
			}
		}
	}	
	console.log("onload");
	startHry();
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
			if(x==true){console.log("new key was generated");}
		}else if(plocha[i] == 5){
			draw(reverse_coords(i)[0], reverse_coords(i)[1], 'black'); //door
			if(x==true){console.log("new door was generated");}
		}else if(plocha[i] == 6){
			draw(reverse_coords(i)[0], reverse_coords(i)[1], 'green');
		}
	}
}

//this is from Milan Sorm https://is.stuba.sk/js/herna/housenka.js ----------------------
// some functions may be changed --------------------------------------------------------
function empty () { }

function startHry () {
	off = false;
	rozpohybujHousenku();
	document['onkeydown'] = stiskKlavesy;
	document['onkeyup'] = uvolneniKlavesy;
}

function zastavHru () {
	off = true;
	zastavHousenku();
	document['onkeydown'] = empty;
	document['onkeyup'] = empty;
}

function uvolneniKlavesy (e) {
	var udalost = e || window.event;

	klavesy[udalost.keyCode] = false;
	console.log(udalost.keyCode);
	$.get("/of",{kod:kod, key:udalost.keyCode}, function(data){
		var r = JSON.parse(data);
		console.log(r);
		if(r === "stop"){
			startuj_hru = 1;
		}
		else if(r === "end"){
			off = true;
			zastavHru();
		}
	});
}

var nastav_smer = new Array (39,40,37,38);
var dopln_smer = Array (74,72,71,89);

function stiskKlavesy (e) {
	if (startuj_hru){
		off = false;
		rozpohybujHousenku();
		startuj_hru = 0;
	}
	var udalost = e || window.event;
	klavesy[udalost.keyCode] = true;
	$.get("/on",{kod:kod, key:udalost.keyCode}, function(data){

	});
}

//----------------------------------------------------------------------------------------