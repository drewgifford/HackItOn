
const path = "/static";
const socket = io.connect("http://localhost:6942");


$(document).ready(function(){
    if(false){

    }
    else {
        $("#content").load(`${path}/html/join.html`, function(){

        });
    }

    var name = "";
    var code = "";
    const maxPoints = 100;
    var game = {};
    var timeId = 0;

    $(document).on("submit", "#createGame", function(e){
        var name = $("#name").val();
        e.preventDefault();
        if(name != ""){

            socket.emit("createGame", name);
        }
    });
    $(document).on("submit", "#startGame", function(e){
        e.preventDefault();
        socket.emit("startGame");
    });

    $(document).on("submit", "#joinGame", function(e){
        var name = $("#name").val();
        var code = $("#code").val();
        e.preventDefault();
        if(name != "" && code != ""){

            socket.emit("joinGame", code, name);
        }
    });

    $(document).on("click", ".task", function(){
        var taskId = $(this).attr("task");
        $("#content").load(`${path}/html/task-${taskId}.html`, function(){
            task(taskId);
        });

    });


    socket.on("enterLobby", (isHost, gameData) => {
        game = gameData;
        $("#content").load(`${path}/html/lobby.html`, function(){
            update();
        });
    });

    socket.on("startGame", (gameData) => {
        game = gameData;
        $("#content").load(`${path}/html/tasks.html`, function(){
            
            update();
            var minutes = 3;
            var time = minutes*60;
            var currentTime = time;

            var timeFunc = function(){
                var currentMin = Math.floor(currentTime/60);
                var currentSec = currentTime % 60;
                if(currentSec == 0){
                    currentSec = "00";
                }
                else if(currentSec < 10){
                    currentSec = "0"+currentSec;
                }
                $("#time").html(`${currentMin}:${currentSec}`);
                currentTime--;
                if(currentTime == -1){
                    clearInterval(timeId);
                }
            }
            timeFunc();
            timeId = setInterval(timeFunc, 1000);
            $(".taskbar").removeClass("hidden");
        });
    });
    socket.on("update", (gameData) => {
        game = gameData;
        update();
    });


    socket.on("error", (err) => {
        $("#error").html(err);
    });



    function update(){
        var str = "";

        if(game["host"] != socket.id){
            $("#startGame").addClass("hidden");
        }

        for(var i in game["players"]){
            var player = game["players"][i];

            //Player List
            str += `<div class='player'><p>${player["name"]}</p></div>`;

            //Task List
            if(i == socket.id){
                var taskStr = "";
                for(var t in player["tasks"]){
                    var task = player["tasks"][t];
                    taskStr += `<div class="task" task="${task.id}"><h1>${task.name}</h1></div>`
                }
                $("#tasks").html(taskStr);
            }
        }
        for(var e = 0; e < game["guessed"].length; e++){
            var list = game["guessed"][e];
            var nStr = "";
            for(var i = 0; i < list.length; i++){
                var letter = list[i];
                if(letter == ""){
                    nStr+="-";
                } else {
                    nStr+=letter;
                }
            }
            var letters = ["A","B","C"];
            $(`#code${letters[e]}hint`).html(nStr.toUpperCase());
        }
        $("#playerList").html(str);
        $("#code").html(game["code"]);
        
        var points = game["points"];
        var pct = (points/maxPoints)*100;
        $("#points").html(parseInt(pct));
        $(".taskbar").css(`background`, `linear-gradient(to right, #1EA818 0%, #1EA818 ${pct}%, transparent ${pct}%, transparent 100%)`);
    }

    

    var currentTask = 0;
    $(document).on("click", ".back", back);
    function back(){
        currentTask = 0;
        for(var audio in audioArray){

            audioArray[audio].pause();
            audioArray[audio].currentTime = 0;
        }
        audioArray = new Array();
        $("#content").load(`${path}/html/tasks.html`, function(){
            selectedTask = 0;
            update();
        });
        
    }
    var audioArray = new Array();
    var connectAudio = new Audio('/static/audio/dialup.mp3');
    
    var selectedTask = 0;
    function task(id){
        selectedTask = id;
        currentTask = setTimeout(function(){

            var thisId = currentTask;
            if(id == "fixBugs"){
                
                var clicks = 0;
                
                var height = $("#task").height()-60;
                var maxLines = parseInt(height/60);
                var length = hackStr.length;
                var currentLine = 0;
                var startLine = 0;
                $("#task").click(function(){
                    if(thisId != currentTask){ return };
                    clicks++;
                    
                    currentLine = parseInt(length*(clicks/50));
                    if(currentLine - startLine > maxLines){
                        startLine = currentLine-maxLines;
                    }
                
                    var hStr = hackStr.slice(startLine, currentLine).join(`\n`);
                    
                    var rand = parseInt(Math.random()*2+1)
                    var audio = new Audio('/static/audio/keyboard'+rand+".mp3");
                    
                    
                    audio.play();
                    
                    $(".hackStr").html(hStr);
                    $(".hackStr").scrollTop($(".hackStr").children().height());
                    if(clicks == 50){
                        audio.pause();
                        audio.currentTime = 0;
                        finishTask(id);
                        return;
                    }
                });
            }
            else if(id == "connect"){
                $(document).one("click", "#task", function(){
                    if(thisId != currentTask){ return };
                    $(".callout").remove();
                    $("#modem").addClass("shake");
                    
                    //connectAudio.play();
                    audioArray.push(connectAudio);
                    var t = setTimeout(function(){
                        if(thisId != currentTask){ return };
                        $(".internetPass").removeClass("hidden");
                        $(".internetPassSubmit").on("click", function(){
                            val = $(".internetPass input[type='text']").val();
                           // if(val != game["netpass"]){
                           //     $("#error").html("Invalid Password");
                           // } else {
                                finishTask(id);
                                return;
                           // }
                        });
                    }, 15400);
                })
            }
            else if (id == "downloadRam"){
                $(".dbPassSubmit").on("click", function(){
                    val = $(".dbPass input[type='text']").val();
                    if(val != game["dbpass"]){
                        $("#error").html("Invalid Password");
                    } else {
                        var i = 0;
                        setInterval(function(){
                            if(thisId != currentTask){ return };
                            i+=(10/10000);
                            var e=Math.sqrt(i)*100;
                            $(".progressBar").css("background",`linear-gradient(to right, #1EA818 0%, #1EA818 ${e}%, transparent ${e}%, transparent 100%)`);
                        }, 10);
                        setTimeout(function(){
                            if(thisId != currentTask){ return };
                            $(".progressBar").addClass("hidden");
                            $("#ramCode").html("RAM KEY: " + game["rampass"]);
                            $("#ramCode").removeClass("hidden");
                        }, 10000);
                        $(".dbPassSubmit").off("click");
                    }
                });
            }
            else if(id == "calibration"){
                $(".intraPassSubmit").on("click", function(){
                    val = $(".intraPass input[type='text']").val();
                    //if(val != game["intrapass"]){
                    //    $("#error").html("Invalid Password");
                    //} else {
                        var i = 0;
                        $(".intraPassSubmit").off("click");
                        $(".intraPass").remove();
                        $(".simon").removeClass("hidden");

                        function seq(){
                            return parseInt(Math.random()*3)+1;
                            
                        }

                        var sequence = [seq(),seq(),seq(),seq(), seq()];
                        function activateTile(tile){
                            $(`#simon-${tile}`).addClass("lit");
                            
                            const sound = document.querySelector(`[data-sound='${tile.toString()}']`);
                            sound.play();
                            setTimeout(function(s){
                                $(`#simon-${tile}`).removeClass("lit");
                                setTimeout(() => {
                                    s.pause();
                                    s.currentTime = 0;
                                });
                                
                            }, 400, sound);
                            
                            
                        }
                        function playRound(round){
                            console.log(sequence);
                            $(".simon div").off("click");
                            for(var i = 0; i < round; i++){
                                console.log(i);
                                setTimeout((step) => {
                                    console.log(sequence[step]);
                                    activateTile(sequence[step]);
                                    
                                }, (i+1)*1000, i);
                                
                            }
                            setTimeout(function(){
                                var userTurns = 0;
                                $(".simon div").on("click", function(){
                                    
                                    console.log($(this).attr("id"));
                                    if(!$(this).attr("id")) { return }
                                    var a = $(this).attr("id").split("-")[1];

                                    activateTile(parseInt(a));

                                    if(parseInt(a) != sequence[userTurns]){
                                        $(".simon div").off("click");
                                        incorrectAudio.currentTime = 0;
                                        incorrectAudio.play();
                                        $(".simon div").off("click");
                                        setTimeout(function(){
                                            playRound(1);
                                        }, 800);
                                    } else {
                                        if(userTurns == round-1){
                                            if(round < 5){
                                                $(".simon div").off("click");
                                                playRound(round+1);
                                            } else {
                                                $(".simon div").off("click");
                                                finishTask(id);
                                                return;
                                            }
                                        }
                                    }
                                    userTurns++;

                                });
                            }, round*600+800);
                        }
                        playRound(1);

                    //}
                });
            }
            else if(id == "crackTheCode"){
                update();
                $('input[type="text"').bind("enterKey",function(e){
                    var id = $(this).attr("id");
                    socket.emit("tryCode", id, $(this).val());
                 });
                 $('input[type="text"]').keyup(function(e){
                     if(e.keyCode == 13)
                     {
                         $(this).trigger("enterKey");
                     }
                 });
            }
            else if (id == "installRam"){
                $(".ramKeySubmit").on("click", function(){
                    val = $(".ramKey input[type='text']").val();
                    if(val != game["rampass"]){
                        $("#error").html("Invalid Password");
                    } else {
                        $(".ramKeySubmit").off("click");
                        finishTask(id);
                        return;
                    }
                });
            }
            else if (id == "internetPassword"){
                var titles = [
                    "Internet Password",
                    "Database Password",
                    "Intranet Password",
                    "Minecraft Password",
                    "Office Passcode",
                    "Website Admin Password",
                    "Email Password",
                    "Yinzernet Password",
                    "UC Account Password",
                    "UC 6+2 Number",
                    "InterNEAT Password",
                    "AOL Password",
                    "5/3 Bank Account Password",
                    "Discord Password",
                    "Twilio Password"
                ]
                titles = shuffle(titles);
                for(var i = 0; i < titles.length; i++){
                    var pass = makeid(8);
                    if(titles[i] == "Internet Password"){
                        pass = game["netpass"];
                    }
                    if(titles[i] == "Database Password"){
                        pass = game["dbpass"];
                    }
                    if(titles[i] == "Intranet Password"){
                        pass = game["intrapass"];
                    }
                    $("#task").append(`<div class='notecard'><div class='notecard-inner'><p class='top'>${titles[i]}</p><p class='bottom'>${pass}</p></div></div>`);
                }
                $(".notecard").each(function(){
                    var left = parseFloat($(this).css("left").split("p")[0]);
                    var top = parseFloat($(this).css("top").split("p")[0]);
                    var rotation = Math.random()*360;
                    $(this).find(".notecard-inner").css("transform",`rotate(${rotation}deg)`);
                    left+=((Math.random()*250)-250)
                    top+=((Math.random()*250)-250)
                    $(this).css("top", top+"px");
                    $(this).css("left", left+"px");
                });
                $(".notecard").draggable({ stack: ".notecard", containment: '#task',
                    start: function(){$(".callout").remove() }});
            }
        }, 0);
    }

    var successAudio = new Audio('/static/audio/success.mp3');
    var correctAudio = new Audio('/static/audio/correct.wav');
    var incorrectAudio = new Audio('/static/audio/incorrect.wav');
    socket.on("correct", () => {
        correctAudio.pause();
        correctAudio.currentTime = 0;
        correctAudio.play();
    });
    socket.on("incorrect", () => {
        incorrectAudio.pause();
        incorrectAudio.currentTime = 0;
        incorrectAudio.play();
    });
    var successPlaying = false;

    socket.on("globalFinish", (currentTaskId) => {

        if(currentTaskId == selectedTask && !successPlaying){
            successAudio.play();
            $("#content").append("<div class='success'><h1>Task Complete!</h1></div>");
            $("body").append("<div class='background'></div>");
            setTimeout(function(){
                $("#content").load(`${path}/html/tasks.html`, function(){
                    update();
                    
                    successAudio.pause();
                    successAudio.currentTime = 0;
                    setTimeout(function(){
                        $(".background").remove();
                    }, 300);
                });
            }, 2700);
        }

    });
    socket.on("disconnect", () => {
        window.reload();
    });
    socket.on("gameOver", (win) => {

        if(win){
            $("#content").append("<div class='success'><h1>You Win!</h1></div>");
        } else {
            $("#content").append("<div class='success'><h1 style='color: red !important'>You Lose.</h1></div>");
        }



        $("body").append("<div class='background'></div>");
            setTimeout(function(){
                $("#content").load(`${path}/html/blank.html`, function(){
                    update();
                    
                    successAudio.pause();
                    successAudio.currentTime = 0;
                    
                    setTimeout(function(){
                        $(".background").remove();
                        //I don't have the time to add a proper function here
                        location.reload();
                    }, 300);
                });
            }, 2700);
        clearInterval(timeId);
        $(".taskbar").addClass("hidden");
        

    });
    
    function finishTask(id){
        successPlaying = true;
        successAudio.play();
        socket.emit("taskComplete", id);
        $("#content").append("<div class='success'><h1>Task Complete!</h1></div>");
        $("body").append("<div class='background'></div>");
        setTimeout(function(){
            $("#content").load(`${path}/html/tasks.html`, function(){
                update();
                
                successAudio.pause();
                successAudio.currentTime = 0;
                setTimeout(function(){
                    $(".background").remove();
                    successPlaying = false;
                }, 300);
            });
        }, 2700);
    }
});
function shuffle(a) {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}
function makeid(length) {
    var result           = '';
    var characters       = 'ABCDEFGHJKLMNOPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
 }
 function sleep(milliseconds) {
    var start = new Date().getTime();
    for (var i = 0; i < 1e7; i++) {
      if ((new Date().getTime() - start) > milliseconds){
        break;
      }
    }
  }



  var mouseX = 0;
  var mouseY = 0;
  $(document).mousemove(function(e){
      mouseX = e.clientX;
      mouseY = e.clientY;
  });


// Terrain stuff.
var background = document.getElementById("bgCanvas"),
bgCtx = background.getContext("2d"),
width = window.innerWidth,
height = document.body.offsetHeight;
(height < 400)?height = 400:height;

background.width = width;
background.height = height;

$(window).on("resize", function(){
height = document.body.offsetHeight;
width = window.innerWidth;
background.width = width;
background.height = height;
entities = [];
//addShootingStars();
addStars();
});

// Second canvas used for the stars
bgCtx.fillStyle = '#05004c';
bgCtx.font = "12px Space Mono";
//bgCtx.fillRect(0,0,width,height);
bgCtx.fillText("1", width,height);

// stars
function Star(options){
this.size = Math.random()*2;
this.speed = Math.random()*.1;
this.num = Math.round(Math.random());
this.x = options.x;
this.y = options.y;
}

Star.prototype.reset = function(c){
this.size = Math.random()*2;
this.speed = Math.random()*.1;
if(c == "+x"){
    this.x = width;
    this.y = Math.random()*height;
}
if(c == "-x"){
    this.x = 0;
    this.y = Math.random()*height;
}
if(c == "+y"){
    this.y = height;
    this.x = Math.random()*width;
}
if(c == "-y"){
    this.y = 0;
    this.x = Math.random()*width;
}
}

Star.prototype.update = function(offsetX, offsetY){
this.x-=this.speed;
this.x+=offsetX;
this.y+=offsetY;
if((this.x<0)||( this.x > width)){
    if(this.x < 0){
        this.reset("+x");
    } else {
        this.reset("-x");
    }
} else
if((this.y < 0) || (this.y > height)){
    if(this.y < 0){
        this.reset("+y");
    } else {
        this.reset("-y");
    }
}
else {
  bgCtx.font = "8px Space Mono";
  bgCtx.fillText(this.num, this.x,this.y);
  //bgCtx.fillRect(this.x,this.y,this.size,this.size); 
}
}

function ShootingStar(){
this.reset();
this.shootingstar = true;
}

ShootingStar.prototype.reset = function(){
this.x = Math.random()*width;
this.y = 0;
this.len = (Math.random()*80)+10;
this.speed = (Math.random()*10)+6;
this.size = (Math.random()*1)+0.1;
this.shootingstar = true;
// this is used so the shooting stars arent constant
this.waitTime =  new Date().getTime() + (Math.random()*3000)+500;
this.active = false;
}

ShootingStar.prototype.update = function(){
if(this.active){
    this.x-=this.speed;
    this.y+=this.speed;
    if(this.x<0 || this.y >= height){
      this.reset();
    }else{
    bgCtx.lineWidth = this.size;
        bgCtx.beginPath();
        bgCtx.moveTo(this.x,this.y);
        bgCtx.lineTo(this.x+this.len, this.y-this.len);
        bgCtx.stroke();
    }
}else{
    if(this.waitTime < new Date().getTime()){
        this.active = true;
    }			
}
}

var entities = [];

// init the stars
function addStars(){
for(var i=0; i < height; i++){
    entities.push(new Star({x:Math.random()*width, y:Math.random()*height}));
}
}

// Add 4 shooting stars that just cycle.
function addShootingStars(){
entities.push(new ShootingStar());
entities.push(new ShootingStar());
entities.push(new ShootingStar());
entities.push(new ShootingStar());
}
addStars();
//addShootingStars();

//animate background
function animate(){
bgCtx.fillStyle = '#000000';
bgCtx.fillRect(0,0,width,height);
bgCtx.fillStyle = '#0E530B';
bgCtx.strokeStyle = '#0E530B';

var entLen = entities.length;
var offsetY = 0.5*((mouseY/height)-0.5);
var offsetX = 0.5*((mouseX/width)-0.5);
while(entLen--){
    entities[entLen].update(offsetX, offsetY);
}


requestAnimationFrame(animate);
}
animate();