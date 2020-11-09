//Yelyzaveta Klysa
var audio = new Audio('https://www.bensound.com/bensound-music/bensound-energy.mp3');
//https://www.bensound.com/licensing

//admin rozhranie sa mozna dostat pomocou: nick:admin, password:admin

window.onbeforeunload = function(){
	$.get('/session/destroy');
}

$("#btn_music").click(function (){
   audio.play();
});

$("#btn_stop_music").click(function (){
   audio.pause();
});

$("#btn_start").click(function (){
   $.get('/start', function(data){
      console.log("click");
      JSON_to_html(data);
   });
});

$("#btn_update_lead").click(function (){
   $.get("/update_lead",function(data){
      let a = JSON.parse(data);
      console.log(a);
      var table = document.getElementById("table_leader");
      table.innerHTML="";
      var row = table.insertRow(0);

      var cell1 = row.insertCell(0);
      var cell2 = row.insertCell(1);
      var cell3 = row.insertCell(2);
      var cell4 = row.insertCell(3);

      cell1.innerHTML = "#";
      cell2.innerHTML = "Meno";
      cell3.innerHTML = "topScore";
      cell4.innerHTML = "topLevel";
      for (let i=0; i<a.length; i++){
         row = table.insertRow(i+1);

         cell1 = row.insertCell(0);
         cell2 = row.insertCell(1);
         cell3 = row.insertCell(2);
         cell4 = row.insertCell(3);
         

         cell1.innerHTML = i+1;
         cell2.innerHTML = a[i][0];
         cell3.innerHTML = a[i][1];
         cell4.innerHTML = a[i][2];

      }
      table.style.display="table";
   });
});

$("#btn_log").click(function (){
   $.get("/log",function(data){
      JSON_to_html(data);
   });
});

$("#btn_refresh").click(function (){
   $.get("/all_games",function(data){
      let a = JSON.parse(data);
      console.log(a);
      var table = document.getElementById("t");
      table.innerHTML="";
      var row = table.insertRow(0);

      var cell1 = row.insertCell(0);
      var cell2 = row.insertCell(1);
      var cell3 = row.insertCell(2);
      var cell4 = row.insertCell(3);

      cell1.innerHTML = "Kod";
      cell2.innerHTML = "Meno";
      cell3.innerHTML = "topScore";
      cell4.innerHTML = "topLevel";
      for (let i=0; i<a.length; i++){
         row = table.insertRow(i+1);

         cell1 = row.insertCell(0);
         cell2 = row.insertCell(1);
         cell3 = row.insertCell(2);
         cell4 = row.insertCell(3);
         

         cell1.innerHTML = a[i][0];
         cell2.innerHTML = a[i][1];
         cell3.innerHTML = a[i][2];
         cell4.innerHTML = a[i][3];

      }
      table.style.display="table";
   });
});

$("#btn_follow").click(function (){
   $.get("/to_window_follow",function(data){
      JSON_to_html(data);
   });
});

$("#btn_use").click(function (){
   $.get("/to_window_play",function(data){
      JSON_to_html(data);
   });
});

function JSON_to_html(data){
   var a = JSON.parse(data)[0];
   var inner = a["innerTags"];
   document.getElementById(a["id"]).innerHTML='';
   inner_f(document.getElementById(a["id"]), inner);
}

function inner_f(el, inner){
   for (var i in inner){ 
      element = document.createElement(inner[i]["tag"]);
      for (var j=1;j<Object.keys(inner[i]).length; j++){
         element.setAttribute(Object.keys(inner[i])[j], Object.values(inner[i])[j])
      }
      if(inner[i]["innerText"] !== "") { element.innerText=inner[i]["innerText"]; }
      el.appendChild(element);
      if(inner[i]["innerTags"] !== ""){
         inner_f(element, inner[i]["innerTags"]);
      }
   }
}

$("#btn_logIn").click(function (){
   var nick=$("#nickname").val();
   var pass=$("#password").val();
   console.log(nick+" "+pass);
   $.get("/login",{nick:nick,pass:pass},function(data){
      JSON_to_html(data);
   });
});

$("#btn_sign").click(function (){
   $.get("/sign",function(data){
      console.log(data);
      JSON_to_html(data);
   });
});

$("#btn_signUp").click(function (){
   console.log("wow");
   var email=$("#email").val();
   var nick=$("#nickname").val();
   var pass=$("#password").val();
   console.log(nick);
   $.get('/signup',{email:email,nick:nick,pass:pass}, function(data){
      JSON_to_html(data);
   });
});


//admin

$("#btn_export").click(function (){
   $.get('/export', function(data){
      let a = JSON.parse(data);
      var arr = [];
      for (let i in Object.values(a)){
         arr.push([a[i].email, a[i].nick, a[i].pass, a[i].maxScore, a[i].maxLevel]);
      }
      let csvContent = "data:text/csv;charset=utf-8,";
      arr.forEach(function(rowArray) {
         let row = rowArray+",";
         csvContent += row + "\r\n";
      });
      var encodedUri = encodeURI(csvContent);
      var link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "my_data.csv");
      link.click();
   });
});

$("#btn_import").click(function (){
   const file = document.getElementById('file').files[0];
   const reader = new FileReader;
   reader.addEventListener('load', () => {
      console.log(reader.result);
      var allRows = reader.result.split(/\r?\n|\r/);
      allRows.length--;
      var arr = [];
      for(let singleRow in allRows){
         var rowCells = allRows[singleRow].split(',');
         arr.push(rowCells);
      }
      console.log(arr);
      $.get('/import',{users:arr}, function(data){
      
      });
   });
   reader.readAsText(file, 'UTF-8');
});

$("#btn_show").click(function (){
   $.get('/show_ses', function(data){
      let a = JSON.parse(data);
      console.log(a);
      var table = document.getElementById("t");
      table.innerHTML="";
      var row = table.insertRow(0);

      var cell1 = row.insertCell(0);
      var cell2 = row.insertCell(1);
      var cell3 = row.insertCell(2);

      cell1.innerHTML = "Meno";
      cell2.innerHTML = "SessionID";
      cell3.innerHTML = "kod/pin";
      for (let i=0; i<a.length; i++){
         row = table.insertRow(i+1);

         cell1 = row.insertCell(0);
         cell2 = row.insertCell(1);
         cell3 = row.insertCell(2);
         

         cell1.innerHTML = a[i][0];
         cell2.innerHTML = a[i][1];
         cell3.innerHTML = a[i][2]+"/"+a[i][3];
      }
      table.style.display="table";
   });
});