//Yelyzaveta Klysa

$.get('/ind', function(data){
    console.log("get index");
    JSON_to_html(data);
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