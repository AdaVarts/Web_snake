//Yelyzaveta Klysa
//some functions are from Milan Sorm https://is.stuba.sk/js/herna/housenka.js

var express = require('express');
var path = require('path');
const session = require('express-session');
const passport = require("passport");
const FileStore = require('session-file-store')(session);
const LocalStrategy = require('passport-local').Strategy;
var cookie = require('cookie');
var cookieParser = require('cookie-parser');
var passwordHash = require('password-hash');
var validator = require("email-validator");
const { text } = require('body-parser');
const WebSocket = require('ws');
const { table } = require('console');
const wss = new WebSocket.Server({port:8082});

//this is from Milan Sorm https://is.stuba.sk/js/herna/housenka.js ----------------------
var xsize = 41;
var ysize = 31;
var zradlo_pocatek = 10;
var klicu_v_levelu = 10;
var cena_klice = 5;
var bodu_za_zradlo_orig = 1;
var bodu_za_klic = 10;
var bodu_za_level = 100;
var navysit_zradlo_za_klic = 1;		// prirustek kazdy level
var zrychleni = 0.8;
var levels = pocet_levelu();
var smery = new Array (1,0,0,1,-1,0,0,-1);
var idx_smeru = new Array (0,2,4,6);
var nastav_smer = new Array (39,40,37,38);
//----------------------------------------------------------------------------------------
var dopln_smer = Array (74,72,71,89);


class Player {
    constructor(nick, max_body, max_level, kod_t) {
		this.nick = nick;
		this.maxBody = max_body;
		this.maxLevel = max_level;
		//this is from Milan Sorm https://is.stuba.sk/js/herna/housenka.js ----------------------
		this.zradlo_za_klic = 6;
		this.rychlost = 250;
		this.lives = 3;
		this.level = 1;
		this.bodu_za_zradlo = bodu_za_zradlo_orig;
		this.plocha = new Array();
		this.povolena_zmena_smeru = 1;
		this.body = 0;
		this.zradla_k_dispozici = 0;
		this.telicko = new Array();
		this.klavesy = new Array();
		this.smer;	
		this.timer;
		this.klicu = 0;
		this.ulozeno_na_klice = 0;
		this.klic_na_scene = false;
		this.dvere_na_scene = false;
		this.startuj_hru = 1;
		this.body_na_zacatku_levelu = 0;
		this.ridkost = false;
		//----------------------------------------------------------------------------------------
		if(kod_t===0){this.kod = Math.floor(Math.random() * (9999+1));}
		else {this.kod = kod_t;}
		this.pin = Math.floor(Math.random() * (9999+1));
		this.played = true;
	}
};

class User {
    constructor(email, nick, pass) {
        this.email = email;
        this.nick = nick;
        this.pass = pass;
        this.maxScore = 0;
        this.maxLevel = 1;
    }
    saveScore(score){
        this.score = score;
        if(this.score>this.maxScore) {this.maxScore = score;}
    }
    saveLevel(level){
        this.level = level;
        if(this.level>this.maxLevel) {this.maxLevel = level;}
    }
};
class Users{
    constructor(){
        this.users = [];
    }
    newUser(email, nick, pass){
        let u = new User(email, nick, pass);
        this.users.push(u);
        return u;
    }
    get allUsers(){
        return this.users;
    }
    get numberOfUsers(){
        return this.users.length;
    }
    getByNick(nick){
        for(let i=0; i<this.numberOfUsers; i++){
            if(nick === this.users[i].nick){return this.users[i];}
        }
    }
    getByEmail(email){
        for(let i=0; i<this.numberOfUsers; i++){
            if(email === this.users[i].email){return this.users[i];}
        }
    }
};

passport.use(new LocalStrategy({
    usernameField: 'nick',
    passwordField: 'pass'
    }, function(nick, pass, done){
        console.log("passport use local strategy");
        var user_t = clients.getByNick(nick);
        if(passwordHash.verify(pass, user_t.pass)){
            console.log('Local strategy returned true');
            return done(null, user_t);
        }else {
            return done(null, false, {message: 'Wrong password'});
        } 
}));
passport.serializeUser((user, done) => {
    done(null, user.nick);
});
passport.deserializeUser(function(nick, done) {
    var user = clients.getByNick(nick)
    if (user) {
        done(null, user);
    } else {
        done("error", null);
    };
});

var clients = new Users();
var players = new Array();
var table_pl_s = new Array();

var sess_options = {
	path: "./sessions/",
	useAsync: true
};
var file_store = new FileStore(sess_options);
var server = express();
server.use(session({
    cookie: {
		path: '/', secure: false, httpOnly: true
	},
	store: file_store, 
    secret: 'secret',
    saveUninitialized: true,
    key: 'sid',
	resave: false
}));
server.use(passport.initialize());
server.use(passport.session());
server.use(express.json());
server.use(express.urlencoded({ extended: false }));
server.use(express.static(path.join(__dirname, 'public')));

var router = express.Router();
server.use(router);

router.get('/session/destroy', function(req, res) {
	let kod_ses = getCodeBySes(req.sessionID);
	if(kod_ses){
		zastavHru(kod_ses, "user");
		for (let i=0; i<table_pl_s.length; i++){
			if(table_pl_s[i][0]===kod_ses){
				table_pl_s.splice(i, 1);
				break;
			}
		}
		for (let i=0; i<players.length; i++){
			if(players[i].kod === kod_ses){ 
				players.splice(i,1); 
				break;
			}
		}
	}
	req.session.destroy();
	if(kod_ses){
		let p = getPlayerByKod(kod_ses);
		delete p;
	}

    res.status(200).send('ok');
});


//main window
router.get('/', function(req, res, next) {
    res.render('index', { title: 'Express' });    
});

router.get('/ind', function(req, res, next) {
	let start=require("./pages/main.json");
    res.send(JSON.stringify([start]));    
});
//********************************** */


// sign up
router.get('/sign', function(req, res, next) {
    let sign=require("./pages/sign.json");
	res.send(JSON.stringify([sign]));   	
});

router.get('/signup', function(req, res, next) {
    const email = req.query.email;
    const nick = req.query.nick;
    var password = passwordHash.generate(req.query.pass);
    var r = /^[a-zA-Z\-]+$/;
    if(nick.match(r) && validator.validate(email) && !clients.getByNick(nick) && !clients.getByEmail(email)){
        clients.newUser(email, nick, password); 
        res.redirect('/log');
    }
    else{res.redirect('/sign');}
});
//***************************************** */


//admin
router.get('/admin', function(req, res, next) {
    let log=require("./pages/admin.json") 
	res.send(JSON.stringify([log]));
});

router.get('/show_ses', function(req, res, next) {
	file_store.list(function(err, data){
		if(err)
			console.log(err);
		else{
			users_for_admin = new Array();
			for(let ses in data){
				let kod = getCodeBySes(data[ses].slice(0, -5));
				if(kod){
					users_for_admin.push([getPlayerByKod(kod).nick, data[ses].slice(0, -5), kod, getPlayerByKod(kod).pin]);
				}
			}
			res.send(JSON.stringify(users_for_admin));
		}
	}); 
});

router.get('/export', function(req, res, next) {
    res.send(JSON.stringify(clients.allUsers));
});

router.get('/import', function(req, res, next) {
    const users_import = req.query.users;
    for (u in users_import){
		let user_imp = clients.newUser(users_import[u][0], users_import[u][1], users_import[u][2]);
		user_imp.saveScore(users_import[u][3]);
		user_imp.saveLevel(users_import[u][4]);
    }
});
//*********************************************** */


//tables
router.get('/update_lead', function(req, res, next) {
    players.sort(function(a, b) {
		return b.body - a.body;
	});
	let pl = new Array();
	for(let i=0; i<players.length; i++){
		pl.push([players[i].nick, players[i].body, players[i].level]);
	}
	res.send(JSON.stringify(pl.slice(0, 5)));
});

router.get('/all_games', function(req, res, next) {
	let pl = new Array();
	for(let i=0; i<players.length; i++){
		pl.push([players[i].kod, players[i].nick, players[i].body, players[i].level]);
	}
	res.send(JSON.stringify(pl));
});
//************************************************** */


//follow someone by code
router.get('/to_window_follow', function(req, res, next) {
	let log=require("./pages/sledovanie.json") 
	res.send(JSON.stringify([log]));
});

router.get('/follow', function(req, res, next) {
	if(getPlayerByKod(parseInt(req.query.kod))){
		res.send(JSON.stringify("ok"));
	}
});
//************************************************** */


//ovladanie husenky suseda pomocou kod/pin
router.get('/to_window_play', function(req, res, next) {
	let log=require("./pages/ovladanie.json");
	res.send(JSON.stringify([log]));
});

router.get('/play', function(req, res, next) {
	if(getPlayerByKod(parseInt(req.query.kod)).pin === parseInt(req.query.pin)){
		res.send(JSON.stringify("ok"));
	}
});
router.get('/left', function(req, res, next) {
	if(getPlayerByKod(parseInt(req.query.kod)).pin === parseInt(req.query.pin)){
		var k = parseInt(req.query.kod);
		stiskKlavesy(k, 37);
		uvolneniKlavesy(k, 37);
		res.send(JSON.stringify("left"));
	}
});
router.get('/up', function(req, res, next) {
	if(getPlayerByKod(parseInt(req.query.kod)).pin === parseInt(req.query.pin)){
		var k = parseInt(req.query.kod);
		stiskKlavesy(k, 38);
		uvolneniKlavesy(k, 38);
		res.send(JSON.stringify("up"));
	}
});
router.get('/down', function(req, res, next) {
	if(getPlayerByKod(parseInt(req.query.kod)).pin === parseInt(req.query.pin)){
		var k = parseInt(req.query.kod);
		stiskKlavesy(k, 40);
		uvolneniKlavesy(k, 40);
		res.send(JSON.stringify("down"));
	}
});
router.get('/right', function(req, res, next) {
	if(getPlayerByKod(parseInt(req.query.kod)).pin === parseInt(req.query.pin)){
		var k = parseInt(req.query.kod);
		stiskKlavesy(k, 39);
		uvolneniKlavesy(k, 39);
		res.send(JSON.stringify("right"));
	}
});
//************************************************************** */


//aktualny score
router.get('/score', function(req, res, next) {
	var p = getPlayerByKod(parseInt(req.query.kod));
	if(p.nick !== "N/A"){ clients.getByNick(p.nick).saveScore(p.body); }
	if(p.body>p.maxBody) {p.maxBody=p.body;} 
	res.send(JSON.stringify(p.body));
});
router.get('/max_score', function(req, res, next) {
	var p = getPlayerByKod(parseInt(req.query.kod));
	if(p.nick !== "N/A"){ res.send(JSON.stringify(clients.getByNick(p.nick).maxScore)); }
	else{ res.send(JSON.stringify(p.maxBody)); }
});
//************************************************************** */


//aktualny level
router.get('/level', function(req, res, next) {
	var p = getPlayerByKod(parseInt(req.query.kod));
	if(p.nick !== "N/A"){ clients.getByNick(p.nick).saveLevel(p.level); }
	if(p.level>p.maxLevel) {p.maxLevel=p.level;} 
	res.send(JSON.stringify(p.level));
});
router.get('/max_level', function(req, res, next) {
	var p = getPlayerByKod(parseInt(req.query.kod));
	if(p.nick !== "N/A"){ res.send(JSON.stringify(clients.getByNick(p.nick).maxLevel)); }
	else{ res.send(JSON.stringify(p.maxLevel)); }
});
//************************************************************** */


//log in
router.get('/log', function(req, res, next) {
    let log=require("./pages/log.json") 
    res.send(JSON.stringify([log]));    
});

router.get('/login', function(req, res, next) {
    if (req.query.nick === "admin" && req.query.pass === "admin"){
        return res.redirect('/admin');
    }

    passport.authenticate('local', (err, user, info) => {
        if(info) {return res.send(info.message)}
        if (err) { return next(err); }
        if (!user) { return res.redirect('/login'); }
        req.login(user, (err) => {
            if (err) { return next(err); }
			req.session.loggedin = true;
			req.session.save(function(err) {
				console.log('saved?!');
				res.redirect('/start');
			});
        })
    })(req, res, next);
});
//********************************************************* */

// this function is from Milan Sorm https://is.stuba.sk/js/herna/housenka.js -----------
// it was changed
function novaHra_param(kod_pl, food, key, door, wall){
	zastavHousenku(kod_pl);

	vymazHousenku(kod_pl);
	vymazPlochu(kod_pl);

	getPlayerByKod(kod_pl).klicu = 0;
	getPlayerByKod(kod_pl).bodu_za_zradlo = bodu_za_zradlo_orig;
	getPlayerByKod(kod_pl).ulozeno_na_klice = 0;
	getPlayerByKod(kod_pl).klic_na_scene = false;
	getPlayerByKod(kod_pl).dvere_na_scene = false;

	Math.floor(getPlayerByKod(kod_pl).rychlost = 250*zrychleni);

	getPlayerByKod(kod_pl).smer = 0;

	var i,j;
	for (j=0; j < ysize; j++) {
		for (x=0; i < xsize; i++) {
			getPlayerByKod(kod_pl).plocha[coords(i,j)] = 0;
		}
	}
	
	if(food){
		for(i=0; i<food.length; i++){
			nastavBarvu(kod_pl, food[i], 2);
			++getPlayerByKod(kod_pl).zradla_k_dispozici;
		}
	}
	if(wall){
		for(i=0; i<wall.length; i++){
			nastavBarvu(kod_pl, wall[i], 3);
		}
	}
	if(key){
		for(i=0; i<key.length; i++){
			nastavBarvu(kod_pl, key[i], 4);
			getPlayerByKod(kod_pl).klic_na_scene = true;
		}
	}
	if(door){
		for(i=0; i<door.length; i++){
			nastavBarvu(kod_pl, door[i], 5);
			getPlayerByKod(kod_pl).dvere_na_scene = true;
		}
	}

	narustHousenky(kod_pl, coords(19,15),false);
	narustHousenky(kod_pl, coords(20,15),true);
}
//----------------------------------------------------------------------------------------


// start play window
router.get('/start', function(req, res, next) {
	var kod_pl=0;
	var kod_ses = getCodeBySes(req.sessionID);
	var max_body_del = 0;
	var max_level_del = 1;
	if(kod_ses){
		for (let i=0; i<table_pl_s.length; i++){
			if(table_pl_s[i][0]===kod_ses){
				table_pl_s.splice(i, 1);
				break;
			}
		}
		for (let i=0; i<players.length; i++){
			if(players[i].kod === kod_ses){ 
				max_body_del=players[i].maxBody; 
				max_level_del=players[i].maxLevel; 
				players.splice(i,1); 
				break;
			}
		}
	}
	else{
		kod_ses=0;
	}
	if(!req.session.loggedin){
		var pl_new = new Player("N/A", max_body_del, max_level_del, kod_ses);
		players.push(pl_new);
		kod_pl = pl_new.kod;
		table_pl_s.push([kod_pl, req.sessionID]);
	}
	else{
		var pl_new = new Player(req.session.passport.user, max_body_del, max_level_del, kod_ses);
		players.push(pl_new);
		kod_pl = pl_new.kod;
		table_pl_s.push([kod_pl, req.sessionID]);
	}

    housenkaInit(kod_pl);
    let start=require("./pages/start.json");
    res.send(JSON.stringify([start]));    
});

router.get('/upload_map', function(req, res, next) {
	var p = getPlayerByKod(parseInt(req.query.kod));
	p.body = 0;
	p.level = 1;
	novaHra_param(parseInt(req.query.kod), req.query.food, req.query.key, req.query.door, req.query.wall);
});

router.get('/on', function(req, res, next) {
	var u = parseInt(req.query.key);
	var k = parseInt(req.query.kod);
	stiskKlavesy(k, u);
	res.send(JSON.stringify("ok"));
});

router.get('/of', function(req, res, next) {
	var u = parseInt(req.query.key);
	var k = parseInt(req.query.kod);
	uvolneniKlavesy(k, u);

	if (u===80){
		res.send(JSON.stringify("stop"));
	}
	else if (u===27){
		res.send(JSON.stringify("end"));
	}
	else{
		res.send(JSON.stringify("of"));
	}
});

router.get('/get_code', function(req, res, next) {
    res.send(JSON.stringify(getCodeBySes(req.sessionID)));
});

router.get('/get_pin', function(req, res, next) {
    res.send(JSON.stringify(getPlayerByKod(getCodeBySes(req.sessionID)).pin));
});
//********************************************** */


wss.on('connection', function connection(ws){
	ws.on('message', function incoming(message){
		if(message.split(' ')[1]=="plocha"){
			if(getPlayerByKod(parseInt(message.split(' ')[2])))
				ws.send(JSON.stringify(getPlayerByKod(parseInt(message.split(' ')[2])).plocha));
		}
	});
});

function getPlayerByKod(kod){
	for(let i=0; i<players.length; i++){
		if(kod === players[i].kod){return players[i];}
	}
}

function getCodeBySes(id){
	for(let i=0; i<table_pl_s.length; i++){
		if(table_pl_s[i][1]===id){
			return table_pl_s[i][0];
		}
	}
}




//this is from Milan Sorm https://is.stuba.sk/js/herna/housenka.js ----------------------
//functions may be changed --------------------------------------------------------

function housenkaInit (kod_pl) {
	var x,y;
	for (y=0; y < ysize; y++) {
		for (x=0; x < xsize; x++) {
			getPlayerByKod(kod_pl).plocha[coords(x,y)] = 0;
		}
	}
	novaHra(kod_pl);
}


function zastavHru (kod_pl, reason) {
	zastavHousenku(kod_pl);
}

function uvolneniKlavesy (kod_pl, u) {
	getPlayerByKod(kod_pl).klavesy[u] = false;
}

function vymazPlochu (kod_pl) {
	var i;
	for (i in getPlayerByKod(kod_pl).plocha) nastavBarvu(kod_pl, i,0);
}

function dalsiLevel (kod_pl) {
	++getPlayerByKod(kod_pl).level;
	getPlayerByKod(kod_pl).body += getPlayerByKod(kod_pl).level*bodu_za_level;
	getPlayerByKod(kod_pl).body_na_zacatku_levelu = getPlayerByKod(kod_pl).body;

	getPlayerByKod(kod_pl).zradlo_za_klic += navysit_zradlo_za_klic;
	novaHra(kod_pl);

	getPlayerByKod(kod_pl).startuj_hru = 1;
}

function novaHra (kod_pl) {
	zastavHousenku(kod_pl);

	vymazHousenku(kod_pl);
	vymazPlochu(kod_pl);

	getPlayerByKod(kod_pl).klicu = 0;
	getPlayerByKod(kod_pl).bodu_za_zradlo = bodu_za_zradlo_orig;
	getPlayerByKod(kod_pl).ulozeno_na_klice = 0;
	getPlayerByKod(kod_pl).klic_na_scene = false;
	getPlayerByKod(kod_pl).dvere_na_scene = false;

	var informace = vygenerujLevel(kod_pl);
	getPlayerByKod(kod_pl).smer = informace[0];
	var x = informace[1];
	var y = informace[2];

	var kam = (getPlayerByKod(kod_pl).smer + 2) % idx_smeru.length;
	var p = Number(idx_smeru[kam]);
	var prdylka_x = x + smery[p];
	var prdylka_y = y + smery[p+1];

	narustHousenky(kod_pl, coords(prdylka_x,prdylka_y),false);
	narustHousenky(kod_pl, coords(x,y),true);

	doplnZradlo(kod_pl, zradlo_pocatek,-1);
}

function rozpohybujHousenku (kod_pl) {
	if (getPlayerByKod(kod_pl).timer) zastavHousenku(kod_pl);
	getPlayerByKod(kod_pl).timer = setTimeout(pohybHousenky,getPlayerByKod(kod_pl).rychlost, kod_pl);
}

function volnePole (kod_pl, nesmi_byt) {
	do {
		var x = Math.floor(Math.random() * xsize);
		var y = Math.floor(Math.random() * ysize);
	} while (getPlayerByKod(kod_pl).plocha[coords(x,y)] != 0 || coords(x,y) == nesmi_byt);	

	return new Array (x,y);
}

function doplnZradlo (kod_pl, kolik,nesmi_byt) {
	var i;
	for (i=0; i<kolik; i++) {
		var pole = volnePole(kod_pl, nesmi_byt);

		nastavBarvu(kod_pl, coords(pole[0],pole[1]),2);
		++getPlayerByKod(kod_pl).zradla_k_dispozici;
	}
}

function vygenerujKlic (kod_pl, nesmi_byt) {
	var pole = volnePole(kod_pl, nesmi_byt);
	nastavBarvu(kod_pl, coords(pole[0],pole[1]),4);
	getPlayerByKod(kod_pl).klic_na_scene = true;
	getPlayerByKod(kod_pl).ulozeno_na_klice -= cena_klice;
	++getPlayerByKod(kod_pl).bodu_za_zradlo;
	doplnZradlo(kod_pl, getPlayerByKod(kod_pl).zradlo_za_klic,nesmi_byt);
}

function vyresKlice (kod_pl, nesmi_byt) {
	if (getPlayerByKod(kod_pl).klic_na_scene || getPlayerByKod(kod_pl).dvere_na_scene) return;
	if (getPlayerByKod(kod_pl).ulozeno_na_klice >= cena_klice)
		vygenerujKlic(kod_pl, nesmi_byt);
}

function pohybHousenky (kod_pl) {
	var smer_x = smery[Number(idx_smeru[getPlayerByKod(kod_pl).smer])];
	var smer_y = smery[Number(idx_smeru[getPlayerByKod(kod_pl).smer])+1];

	var hlavicka = reverse_coords(getPlayerByKod(kod_pl).telicko[0]);

	smer_x += hlavicka[0];
	smer_y += hlavicka[1];

	if (smer_x >= xsize) smer_x -= xsize;
	if (smer_y >= ysize) smer_y -= ysize;
	if (smer_x < 0) smer_x += xsize;
	if (smer_y < 0) smer_y += ysize;

	var narust = 0;
	var nova_pozice = coords(smer_x,smer_y);
	if (getPlayerByKod(kod_pl).plocha[nova_pozice] == 2) { // zradlo
		getPlayerByKod(kod_pl).body += getPlayerByKod(kod_pl).bodu_za_zradlo;  ++getPlayerByKod(kod_pl).ulozeno_na_klice;  
		vyresKlice(kod_pl, nova_pozice);
		--getPlayerByKod(kod_pl).zradla_k_dispozici;  ++narust;
		nastavBarvu(kod_pl, nova_pozice,0);
	} else if (getPlayerByKod(kod_pl).plocha[nova_pozice] == 4) { // klic
		++getPlayerByKod(kod_pl).klicu;  
		getPlayerByKod(kod_pl).klic_na_scene = false;
		nastavBarvu(kod_pl, nova_pozice,0);

		getPlayerByKod(kod_pl).body += bodu_za_klic;
		++narust;
		
		if (getPlayerByKod(kod_pl).klicu == klicu_v_levelu) vygenerujDvere(kod_pl, nova_pozice); else vyresKlice(kod_pl, nova_pozice);
	} else if (getPlayerByKod(kod_pl).plocha[nova_pozice] == 5) { // dvere
		dalsiLevel(kod_pl);
		return;
	}

	if (getPlayerByKod(kod_pl).plocha[nova_pozice] == 0) {
		odbarviHlavu(kod_pl);
		narustHousenky(kod_pl, nova_pozice,true);
		getPlayerByKod(kod_pl).povolena_zmena_smeru = 1;
		if (!narust) nastavBarvu(kod_pl, getPlayerByKod(kod_pl).telicko.pop(),0);
		rozpohybujHousenku(kod_pl);
	} else
		if (getPlayerByKod(kod_pl).plocha[nova_pozice] == 1) koncime(kod_pl, 'worm');
		else koncime(kod_pl, 'wall');
}

function koncime (kod_pl, reason) {
	--getPlayerByKod(kod_pl).lives;
	if (getPlayerByKod(kod_pl).lives > 0) {
		getPlayerByKod(kod_pl).body = getPlayerByKod(kod_pl).body_na_zacatku_levelu;
		novaHra(kod_pl);  
		getPlayerByKod(kod_pl).startuj_hru = 1;
	} else 
		zastavHru(kod_pl, reason);
}

function vygenerujDvere (kod_pl, nesmi_byt) {
	var pole = volnePole(nesmi_byt);

	getPlayerByKod(kod_pl).dvere_na_scene = true;
	nastavBarvu(kod_pl, coords(pole[0],pole[1]),5);
	doplnZradlo(kod_pl, getPlayerByKod(kod_pl).zradlo_za_klic,nesmi_byt);
}

function zastavHousenku (kod_pl) {
	if (getPlayerByKod(kod_pl).timer) {
		clearTimeout(getPlayerByKod(kod_pl).timer);
		getPlayerByKod(kod_pl).timer = undefined;
	}
}

function narustHousenky (kod_pl, pozice,hlavicka) {
	getPlayerByKod(kod_pl).telicko.unshift(pozice);
	if (hlavicka) nastavBarvu(kod_pl, pozice,6); else nastavBarvu(kod_pl, pozice,1);
}

function odbarviHlavu (kod_pl) {
	nastavBarvu(kod_pl, getPlayerByKod(kod_pl).telicko[0],1);
}

function vymazHousenku (kod_pl) {
	while (getPlayerByKod(kod_pl).telicko.length > 0) nastavBarvu(kod_pl, getPlayerByKod(kod_pl).telicko.pop(),0);
}

function nastavBarvu (kod_pl, pozice, barva) {
	getPlayerByKod(kod_pl).plocha[pozice] = barva;
}

function coords (x,y) {
	return y*xsize + x;
}

function reverse_coords (pozice) {
	var x = pozice % xsize;
	var y = Math.floor(pozice / xsize);

	return new Array (x,y);
}

function zed_poly (kod_pl, useky) {
	var last_x = useky[0];
	var last_y = useky[1];
	var i;
	for (i=2; i < useky.length; i += 2) {
		var x = useky[i];
		var y = useky[i+1];
		zed(kod_pl, last_x,last_y,x,y);
		last_x = x;  last_y = y;
	}
}

function ridka_zed (kod_pl, x1,y1,x2,y2) {
	getPlayerByKod(kod_pl).ridkost = true;
	zed(kod_pl, x1,y1,x2,y2);
	getPlayerByKod(kod_pl).ridkost = false;
}

function zed (kod_pl, x1,y1,x2,y2) {
	var steep = Math.abs(y2-y1) > Math.abs(x2-x1);
	if (steep) { var p = x1;  x1 = y1;  y1 = p;  p = x2;  x2 = y2;  y2 = p; }
	if (x1 > x2) { var p = x1;  x1 = x2;  x2 = p;  p = y1;  y1 = y2;  y2 = p; }

	var dx = x2 - x1;
	var dy = y2 - y1;

	var slope;
	if (dy < 0) {
		slope = -1;
		dy = -dy;
	} else {
		slope = 1;
	}

	var incE = 2 * dy;
	var incNE = 2 * dy - 2 * dx;
	var d = 2 * dy - dx;
	var y = y1;
	var x;
	var ted_jo = true;

	for (x=x1; x <= x2; x++) {
		if (ted_jo) if (steep) cihla(kod_pl, y,x); else cihla(kod_pl, x,y);
		if (d <= 0) d += incE;
		else { d += incNE; y += slope; }
		if (getPlayerByKod(kod_pl).ridkost) ted_jo = !ted_jo;
	}
}

function cihla (kod_pl, x,y) {
	nastavBarvu(kod_pl, coords(x,y),3);
}

function zed_full (kod_pl, x1,y1,x2,y2) {
	if (y1 > y2) { var p = y1;  y1 = y2;  y2 = p; }

	var y;
	for (y=y1; y <= y2; y++) zed(kod_pl,x1,y,x2,y);
}

function vygenerujLevel (kod_pl) {
	var results = new Array (0,0,0);

	var mujlevel = getPlayerByKod(kod_pl).level-1;
	if (mujlevel > levels) {
		mujlevel = mujlevel % levels;
		if (mujlevel == 0) Math.floor(getPlayerByKod(kod_pl).rychlost *= zrychleni);
		if (getPlayerByKod(kod_pl).rychlost < 1) getPlayerByKod(kod_pl).rychlost = 1;
	}

	results[1] = Math.floor(xsize / 2);
	results[2] = Math.floor(ysize / 2);

	mujlevel = debug_level(mujlevel);

	zed_poly(kod_pl, new Array(0,0,xsize-1,0,xsize-1,ysize-1,0,ysize-1,0,0));

	if (mujlevel == 1) {
		zed(kod_pl, Math.floor(xsize/4),Math.floor(ysize/2), Math.floor(3*xsize/4), Math.floor(ysize/2));
		results[2] += 3;
	} else if (mujlevel == 2) {
		zed(kod_pl, Math.floor(xsize/4), 4, Math.floor(xsize/4), ysize-5);
		zed(kod_pl, Math.floor(3*xsize/4), 4, Math.floor(3*xsize/4), ysize-5);
	} else if (mujlevel == 3) {
		zed(kod_pl, 4, Math.floor(ysize/2), xsize-5, Math.floor(ysize/2));
		zed(kod_pl, Math.floor(xsize/2), 4, Math.floor(xsize/2), ysize-5);
		results[1] += 5;  results[2] += 5;
	} else if (mujlevel == 4) {
		var x;
		for (x=8; x<xsize; x+=8)
			zed(kod_pl, x,0,x,ysize-7);
		results[0] = 1;
	} else if (mujlevel == 5) {
		var suda = false;
		var x;
		for (x=8; x<xsize; x+=8) {
			if (suda) zed(kod_pl, x,6,x,ysize-1); else zed(kod_pl, x,0,x,ysize-7);
			suda = !suda;
		}
		results[0] = 3;
	} else if (mujlevel == 6) {
		var x;
		for (x=8; x<xsize; x+=8) {
			zed(kod_pl, x,0,x,Math.floor(ysize/2)-3);
			zed(kod_pl, x,Math.floor(ysize/2)+3,x,ysize-1);
		}
	} else if (mujlevel == 7) {
		var suda = false;
		var y;
		for (y=6; y<ysize; y+=6) {
			if (suda) zed(6,y,xsize-1,y); else zed(kod_pl, 0,y,xsize-7,y);
			suda = !suda;
		}
	} else if (mujlevel == 8) {
		var y;
		for (y=6; y<ysize; y+=6) {
			zed(kod_pl, 0,y,Math.floor(xsize/2)-4,y);
			zed(kod_pl, Math.floor(xsize/2)+4,y,xsize-1,y);
		}
	} else if (mujlevel == 9) {
		zed(kod_pl, Math.floor(xsize/4)+1,6,Math.floor(3*xsize/4)-1,6);
		zed(kod_pl, Math.floor(xsize/4)+1,ysize-7,Math.floor(3*xsize/4)-1,ysize-7);
		zed(kod_pl, Math.floor(xsize/4)-1,8,Math.floor(xsize/4)-1,ysize-9);
		zed(kod_pl, Math.floor(3*xsize/4)+1,8,Math.floor(3*xsize/4)+1,ysize-9);
	} else if (mujlevel == 10) {
		var i;
		for (i=0; i<2; i++) {
			var n = 3*i+1;
			zed(kod_pl, Math.floor(n*xsize/7)+1,6,Math.floor((n+2)*xsize/7)-1,6);
			zed(kod_pl, Math.floor(n*xsize/7)+1,ysize-7,Math.floor((n+2)*xsize/7)-1,ysize-7);
			zed(kod_pl, Math.floor(n*xsize/7)-1,8,Math.floor(n*xsize/7)-1,ysize-9);
			zed(kod_pl, Math.floor((n+2)*xsize/7)+1,8,Math.floor((n+2)*xsize/7)+1,ysize-9);
		}
		results[0] = 1;
	} else if (mujlevel == 11) {
		var i;
		for (i=0; i<2; i++) {
			zed(kod_pl, Math.floor(xsize/4)+1+4*i,6+4*i,Math.floor(3*xsize/4)-1-4*i,6+4*i);
			zed(kod_pl, Math.floor(xsize/4)+1+4*i,ysize-7-4*i,Math.floor(3*xsize/4)-1-4*i,ysize-7-4*i);
			zed(kod_pl, Math.floor(xsize/4)-1+4*i,8+4*i,Math.floor(xsize/4)-1+4*i,ysize-9-4*i);
			zed(kod_pl, Math.floor(3*xsize/4)+1-4*i,8+4*i,Math.floor(3*xsize/4)+1-4*i,ysize-9-4*i);
		}
	} else if (mujlevel == 12) {
		zed(kod_pl, Math.floor(xsize/6),Math.floor(ysize/4),Math.floor(5*xsize/6),Math.floor(3*ysize/4));
		zed(kod_pl, Math.floor(xsize/6),Math.floor(3*ysize/4),Math.floor(5*xsize/6),Math.floor(ysize/4));
		zed_full(kod_pl, Math.floor(xsize/2)-2,Math.floor(ysize/2)-1,Math.floor(xsize/2)+2,Math.floor(ysize/2)+1);
		results[2] += 10;
	} else if (mujlevel == 13) {
		zed(kod_pl, Math.floor(xsize/6),Math.floor(ysize/4),Math.floor(5*xsize/6),Math.floor(3*ysize/4));
		zed(kod_pl, Math.floor(xsize/6),Math.floor(3*ysize/4),Math.floor(5*xsize/6),Math.floor(ysize/4));
		zed(kod_pl, Math.floor(xsize/2),Math.floor(ysize/6),Math.floor(xsize/2),Math.floor(5*ysize/6));
		zed_full(kod_pl, Math.floor(xsize/2)-2,Math.floor(ysize/2)-1,Math.floor(xsize/2)+2,Math.floor(ysize/2)+1);
		results[1] += 5;  results[2] += 10;
	} else if (mujlevel == 14) {
		zed(kod_pl, 0,Math.floor(ysize/4),Math.floor(xsize/2),Math.floor(2*ysize/3));
		zed(kod_pl, xsize-1,Math.floor(3*ysize/4),Math.floor(xsize/2),Math.floor(ysize/3));
	} else if (mujlevel == 15) {
		zed(kod_pl, 0,Math.floor(ysize/4),Math.floor(xsize/3),Math.floor(2*ysize/3));
		zed(kod_pl, xsize-1,Math.floor(3*ysize/4),Math.floor(2*xsize/3),Math.floor(ysize/3));
		zed(kod_pl, Math.floor(3*xsize/4),0,Math.floor(xsize/3),Math.floor(ysize/3)+1);
		zed(kod_pl, Math.floor(xsize/4),ysize-1,Math.floor(2*xsize/3),Math.floor(2*ysize/3)-1);
		cihla(kod_pl, Math.floor(xsize/4)+3,ysize-2);
		cihla(kod_pl, Math.floor(3*xsize/4)-3,1);
		cihla(kod_pl, 1,Math.floor(ysize/4)+2);
		cihla(kod_pl, xsize-2,Math.floor(3*ysize/4)-2);
	} else if (mujlevel == 16) {
		zed(kod_pl, Math.floor(xsize/4)+1,Math.floor(ysize/2)-1,Math.floor(xsize/2)-1,6);
		zed(kod_pl, Math.floor(3*xsize/4)-1,Math.floor(ysize/2)-1,Math.floor(xsize/2)+1,6);
		zed(kod_pl, Math.floor(3*xsize/4)-1,Math.floor(ysize/2)+1,Math.floor(xsize/2)+1,ysize-7);
		zed(kod_pl, Math.floor(xsize/4)+1,Math.floor(ysize/2)+1,Math.floor(xsize/2)-1,ysize-7);
	} else if (mujlevel == 17) {
		ridka_zed(kod_pl, Math.floor(xsize/2),0,Math.floor(xsize/2),ysize-1);
		results[1] += 3;
	} else if (mujlevel == 18) {
		var suda = false;
		var x;
		for (x=8; x<xsize; x+=8) {
			if (suda) ridka_zed(kod_pl, x,0,x,ysize-1); else ridka_zed(kod_pl, x,1,x,ysize-1);
			suda = !suda;
		}
		results[0] = 3;
	} else if (mujlevel == 19) {
		zed(kod_pl, 2,Math.floor(ysize/2),xsize-3,Math.floor(ysize/2));
		results[2] += 3;
	} else if (mujlevel == 20) {
		zed(kod_pl, 2,Math.floor(ysize/2),xsize-3,Math.floor(ysize/2));
		zed(kod_pl, Math.floor(xsize/2), 2, Math.floor(xsize/2), ysize-3);
		results[1] += 5;  results[2] += 5;
	} else if (mujlevel == 21) {
		zed(kod_pl, 2,Math.floor(ysize/2),xsize-3,Math.floor(ysize/2));
		var x;
		for (x=1; x <= 3; x++)
			zed(kod_pl, Math.floor(x*xsize/4), 2, Math.floor(x*xsize/4), ysize-3);
		results[1] += 5;  results[2] += 5;
		results[0] = 1;
	} else if (mujlevel == 22) {
		var suda = false;
		var x;
		for (x=8; x<xsize; x+=8) {
			if (suda) zed(kod_pl, x,2,x,ysize-1); else zed(kod_pl, x,0,x,ysize-3);
			suda = !suda;
		}
		results[0] = 3;
	} else if (mujlevel == 23) {
		var i;
		for (i=0; i<2; i++) {
			var n = 3*i+1;
			zed(kod_pl, Math.floor(n*xsize/7)+1,3+i*Math.floor(ysize/2),Math.floor((n+2)*xsize/7)-1,3+i*Math.floor(ysize/2));
			zed(kod_pl, Math.floor(n*xsize/7)+1,Math.floor(ysize/2)-3+i*Math.floor(ysize/2),Math.floor((n+2)*xsize/7)-1,Math.floor(ysize/2)-3+i*Math.floor(ysize/2));
			zed(kod_pl, Math.floor(n*xsize/7)-1,5+i*Math.floor(ysize/2),Math.floor(n*xsize/7)-1,Math.floor(ysize/2)-5+i*Math.floor(ysize/2));
			zed(kod_pl, Math.floor((n+2)*xsize/7)+1,5+i*Math.floor(ysize/2),Math.floor((n+2)*xsize/7)+1,Math.floor(ysize/2)-5+i*Math.floor(ysize/2));

			n = 3*((i+1) % 2) + 1;

			zed(kod_pl, Math.floor(n*xsize/7)+1,Math.floor(ysize/2)-3+i*Math.floor(ysize/2),Math.floor((n+2)*xsize/7)-1,Math.floor(ysize/2)-3+i*Math.floor(ysize/2));
			zed(kod_pl, Math.floor((n+1)*xsize/7)-1,4+i*Math.floor(ysize/2),Math.floor(n*xsize/7)-1,Math.floor(ysize/2)-5+i*Math.floor(ysize/2));
			zed(kod_pl, Math.floor((n+1)*xsize/7)+1,4+i*Math.floor(ysize/2),Math.floor((n+2)*xsize/7)+1,Math.floor(ysize/2)-5+i*Math.floor(ysize/2));
			cihla(kod_pl, Math.floor(n*xsize/7)-1,Math.floor(ysize/2)-4+i*Math.floor(ysize/2));
			cihla(kod_pl, Math.floor((n+2)*xsize/7)+1,Math.floor(ysize/2)-4+i*Math.floor(ysize/2));
		}
	}

	return results;
}

function pocet_levelu () {
	return 24;
}

function debug_level (lvl) {
	return lvl;
}

function stiskKlavesy (kod_pl, u) {
	getPlayerByKod(kod_pl).klavesy[u] = true;

	if (getPlayerByKod(kod_pl).startuj_hru) {
		rozpohybujHousenku(kod_pl);
		getPlayerByKod(kod_pl).startuj_hru = 0;
	}

	var obslouzena = false;
	var klavesa;
	for (klavesa in nastav_smer)
		if (nastav_smer[klavesa] == u) {
			if (getPlayerByKod(kod_pl).smer % 2 != klavesa % 2 && getPlayerByKod(kod_pl).povolena_zmena_smeru) {
				getPlayerByKod(kod_pl).smer = klavesa;
				getPlayerByKod(kod_pl).povolena_zmena_smeru = 0;
			}
			obslouzena = true;
		}
	for (klavesa in dopln_smer)
		if (dopln_smer[klavesa] == u) {
			if (getPlayerByKod(kod_pl).smer % 2 != klavesa % 2 && getPlayerByKod(kod_pl).povolena_zmena_smeru) {
				getPlayerByKod(kod_pl).smer = klavesa;
				getPlayerByKod(kod_pl).povolena_zmena_smeru = 0;
			}
			obslouzena = true;
		}

	if (u == 27) {  // esc
		obslouzena = true;
		zastavHru(kod_pl, 'user');
	} else if (u == 80) { // P
		obslouzena = true;
		zastavHousenku(kod_pl);
		getPlayerByKod(kod_pl).startuj_hru = 1;
	}
	return !obslouzena;
}

//---------------------------------------------------------------------------------------



module.exports = server;
