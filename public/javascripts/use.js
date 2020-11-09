//Yelyzaveta Klysa

window.onbeforeunload = function(){
	$.get('/session/destroy');
}
var kod, pin;

$("#btn_use").click(function (){
    kod=parseInt($("#code").val());
    pin=parseInt($("#pin").val());
	$.get("/play",{kod:kod, pin:pin},function(data){
        if(JSON.parse(data)==="ok"){
            $("#btn_left").click(function (){
                $.get("/left",{kod:kod, pin:pin},function(data){
                    console.log(JSON.parse(data));
                });
            });
            $("#btn_up").click(function (){
                $.get("/up",{kod:kod, pin:pin},function(data){
                    console.log(JSON.parse(data));
                });
            });
            $("#btn_down").click(function (){
                $.get("/down",{kod:kod, pin:pin},function(data){
                    console.log(JSON.parse(data));
                });
            });
            $("#btn_right").click(function (){
                $.get("/right",{kod:kod, pin:pin},function(data){
                    console.log(JSON.parse(data));
                });
            });
        }
	});
});
