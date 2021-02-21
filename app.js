
const io = require("socket.io")({
    cors: {
        origin: '*',
      }
})
var express = require("express");
var randomWords = require('random-words');
var querystring = require('querystring');
const app = express();
const http = require('http');
app.use(express.json());
const path = require("path");


app.use('/static', express.static(__dirname + '/revouc2021/static/'));

app.get('/', (req, res) => {
    console.log("test");
    res.sendFile(path.join(__dirname+'/revouc2021/templates/index.html'));
})

var checkWord = require('check-word'),
    words     = checkWord('en');
var games = {
}
const tasks = {

    "basic": {
        "fixBugs": {
            "id": "fixBugs",
            "points": 10,
            "name": "Fix Bugs in Program"
        },
        "crackTheCode": {
            "id": "crackTheCode",
            "points": 40,
            "name": "Crack the Code",
            "unlock": "firewall"
        },
        "connect": {
            "id": "connect",
            "points": 10,
            "requires": "internetPassword",
            "name": "Connect to the Internet",
            "unlock": "internet"
        },
        "downloadRam": {
            "id": "downloadRam",
            "points": 10,
            "prereq": "internet",
            "name": "Download More RAM",
            "max": 1,
        },
        "calibration": {
            "id": "calibration",
            "points": 10,
            "prereq": "firewall",
            "name": "Network Calibration"
        },
        "installRam": {
            "id": "installRam",
            "points": 20,
            "prereq": "internet",
            "requires": "downloadRam",
            "name": "Install RAM",
            "max": 1,
        },
        "internetPassword": {
            "id": "internetPassword",
            "points": 0,
            "name": "Passwords List",
            "type": "info",
            "max": 1,
        }
    }

}

io.on('connection', function(socket) {

    // Disconnect listener
    socket.on('disconnect', function() {
        console.log('Client disconnected.');
    });

    socket.on('createGame', (name) => {
        //Game Code Generator
        var gcode = 000000;
        while (true){
            gcode = parseInt(Math.random() * (899999 - 00) + 100000);

            //test
            console.log(gcode);
            console.log(games);
            for(var g in games){
                var game = games[g];
                if(game.code){
                    if(game.code == gcode){
                        
                        continue;
                    }
                }
            }
            break;
        }
        var id = socket.id;
        var words = ["","",""];
        for(var i = 0; i < 3; i++){
            var w = "";
            while (w.length != 4){
                w = randomWords({exactly: 1, maxLength: 4})[0];
            }
            words[i] = w;
        }
        games[gcode] = {
            "code": gcode,
            "status": "lobby",
            "host": id,
            "players": {},
            "points": 0,
            "netpass": makeid(8),
            "dbpass": makeid(8),
            "intrapass": makeid(8),
            "rampass": randomWords({exactly: 3, maxLength:10}).join(" "),
            "unlocks": [],
            "words": words,
            "guessed": [["","","",""],["","","",""],["","","",""]]
        }
        games[gcode]["players"][id] = { name: name };
        socket.join(gcode.toString());
        socket.emit("enterLobby", true, games[gcode]); //true, is the host

        //SEND UPDATE
        io.to(gcode.toString()).emit("update", games[gcode]);
        
        
    });
    socket.on("leaveRooms", (code) => {
        socket.leave(code);
    });
    socket.on("startGame", () => {
        var roomInt = getCode(socket);
        if(!roomInt) return;
        
        //Check if user is the host
        var isHost = games[roomInt]["host"] == socket.id;
        if(!isHost){
            return;
        }

        //Check if enough players are in the lobby
        console.log(Object.size("LENGTH: " +games[roomInt]["players"]));
        if(!(Object.size(games[roomInt]["players"]) > 1)){
            socket.emit("error", "Not enough players");
            return;
        }

        //SEND UPDATE
        var game = games[roomInt];
        game["status"] = 1;

        //Game will take 3 minutes
        const minutes = 3;
        var endDate = new Date(Date.now() + minutes * 60000);
        game["end"] = endDate.getMilliseconds();

        //Task Assignments

        var blacklisted = [];
        for(var u in shuffleArray(game["players"])){
            var userObj = game["players"][u];
            if(!userObj["tasks"]){
                userObj["tasks"] = [];
            }
            for(var t in tasks["basic"]){
                /* Adding tasks */
                // Find if the task has a 'requires' property
                // If it does, look for that property, which should be an ID, in the "information" tasks table
                // Add the task ID to a 'blacklisted' array and don't allow anyone else to get that task
                var taskObject = tasks["basic"][t];
                if(taskObject["type"]){
                    if(taskObject["type"] == "info"){
                        continue;
                    }
                }
                if(taskObject["prereq"]) { continue }
                if(blacklisted.includes(taskObject.id)){
                    continue;
                } else {
                    var requires = taskObject["requires"];
                    if(requires){
                        blacklisted.push(taskObject.id);
                        var randPlayers = shuffleArray(Object.keys(game["players"]));


                        for(var i = 0; i < randPlayers.length; i++){
                            var targetUser = randPlayers[i];
                            console.log(targetUser);
                            console.log(u);
                            if(targetUser == u){ continue; }
                            else {
                                console.log("user: "+u);
                                var taskList = game["players"][targetUser]["tasks"];
                                if(!taskList){
                                    taskList = [];
                                }
                                taskList.push(tasks["basic"][requires]);
                                game["players"][targetUser]["tasks"] = taskList;
                                break;
                            }
                        }
                    }

                    //Add task to user
                    userObj["tasks"].push(tasks["basic"][t]);
                }
            }
        }
        io.to(roomInt.toString()).emit("startGame", games[roomInt]);

        //On game end
        setTimeout(function(){

            io.to(roomInt.toString()).emit("gameOver", false);

        }, (minutes * 60000));

    });
    socket.on("tryCode", (id, check) => {
        console.log(id);
        var code = getCode(socket);
        if(!code) return;
        check = check.toLowerCase();
        if(check.length != 4){
            socket.emit("incorrect");
            socket.emit("error", "Word must be 4 letters long.");
            return;
        }
        if(!words.check(check)){
            socket.emit("incorrect");
            socket.emit("error", "Invalid word");
            return;
        }
        socket.emit("error", "");
        var chars = check.split("");
        var codeIndex = 0;
        if(id == "codeA"){
            codeIndex = 0;
        }
        if(id == "codeB"){
            codeIndex = 1;
        }
        if(id == "codeC"){
            codeIndex = 2;
        }
        console.log(games[code]["words"]);
        var checkAgainst = games[code]["words"][codeIndex].split("");
        var guessed = games[code]["guessed"][codeIndex];
        var initialGuessed = [...guessed];
        for(var i = 0; i < chars.length; i++){
            var letter = chars[i];
            var checkLetter = checkAgainst[i];
            if(letter == checkLetter){
                guessed[i] = checkLetter;
            }


        }
        
        if(!arraysEqual(guessed,initialGuessed)){
            socket.emit("correct");
        } else {
            socket.emit("incorrect");
        }

        var complete = true;
        
        for(var i = 0; i < 3; i++){
            var ca = games[code]["words"][i].toLowerCase();
            console.log(ca);
            console.log( games[code]["guessed"][i].join("") );
            if(ca != games[code]["guessed"][i].join("").toLowerCase()){
                complete = false;
                break;
            }
        }

        games[code]["guessed"][codeIndex] = guessed;
        console.log("COMPLETE: "+complete);
        if(complete){
            
            globalFinishTask("crackTheCode", code);
            addTasksFrom("crackTheCode", code);
        }
        io.to(code.toString()).emit("update", games[code]);

    });
    socket.on("joinGame", (code, name) => {
        if(games[code]){
            //Check if game is in progress
            if(games[code]["status"] == 1){
                socket.emit("error", "Game is in progress");
                return;
            }

            /*
            id: {
                name: name
                tasks: {}
            }
            id2: {
                name: name
                tasks: {}
            }

            */

            for(var i in games[code]["players"]){
                var n = games[code]["players"][i];
                if(n.name.toLowerCase() == name.toLowerCase()){
                    //Names are equal
                    socket.emit("error", "Name is already in use")
                    return;
                }
            }

            //Joins game if exists
            games[code]["players"][socket.id] = { name: name };
            
            socket.join(code.toString());
            socket.emit("enterLobby", false, games[code]); //false, is not the host

            //SEND UPDATE TO ENTIRE ROOM
            io.to(code.toString()).emit("update", games[code]);
        }
        else{
            //Throws game does not exist error
            socket.emit("error", "Game does not exist")
        }
    });


    //If you're reading this, it's 5:34 AM and i'm tired but we still need to push ahead! Let's get this done!
    function addTasksFrom(taskId, code){
        var game = games[code];
        
        var players = game["players"];
        var taskObj = tasks["basic"][taskId];

        //If the task unlocks new tasks
        if(!taskObj["unlock"]){ return };

        //Loop all tasks
        for(var taskId in tasks["basic"]){
            var task = tasks["basic"][taskId];
            //console.log("THIS IS A TASK I WANT SLEPE BUT I CANT GET IT ",task);

            //If the task doesn't have a prerequesite, skip
            if(!task["prereq"]) { continue }

            //If the tasks's prereq is not the unlock, skip
            if(!(task["prereq"] == taskObj["unlock"])){ continue }

            //If the task requires another, skip. We'll handle this later
            if(task["requires"]) { continue }

            //Shuffle players
            var playersShuffled = shuffleArray(Object.keys(players));
            
            var count = 0;
            var inc = 0;

            for(var i = 0; i < playersShuffled.length; i++){
                var key = playersShuffled[i];
                var player = players[key];

                var max = task["max"] ? task["max"] : 0;


                
                for(var resultTaskId in tasks["basic"]){
                    
                    var resultTask = tasks["basic"][resultTaskId];

                    //var resultTaskObj = tasks["basic"][resultTask];

                    //This is where we'll handle required tasks.
                    if(!resultTask["requires"]){ continue }

                    if(!(resultTask["requires"] == task["id"])){ continue }

                    //Add to a player that is NOT the one receiving the main task.
                    var innerPlayersShuffled = shuffleArray(playersShuffled.filter(function(item){
                        return item != key;
                    }));

                    console.log(resultTask);

                    var innerMax = resultTask["max"] ? resultTask["max"] : 0;
                    
                    
                    for(var inner = 0; inner < innerPlayersShuffled.length; inner++){
                        var innerKey = innerPlayersShuffled[inner];
                        var innerPlayer = innerPlayersShuffled[innerKey];
                        console.log("INNER COUNT: "+inc);


                        if((innerMax > 0 && (inc < innerMax)) || (innerMax == 0)){
                            inc = inc + 1;
                            console.log("INNER COUNT: "+inc);
                            //Add task
                            console.log("ADD TASK ", resultTask["id"]);
                            game["players"][innerKey]["tasks"].push(resultTask);
                            
                        }
                    }
                    inc = 0;
                }

                    if((max > 0 && (count < max)) || (max == 0)){
                        game["players"][key]["tasks"].push(task);
                        count++;
                    }
                

            }



        }

    }

    socket.on("taskComplete", (taskId) => {
        console.log(taskId);
        var code = getCode(socket);
        if(!code) return;
        var taskObj = tasks["basic"][taskId];
        var taskPoints = taskObj["points"];
        var totalPoints = games[code]["points"]
        totalPoints= parseInt(totalPoints + taskPoints);

        games[code]["points"] = totalPoints;

        var playerTasks = games[code]["players"][socket.id]["tasks"];
       
        playerTasks = playerTasks.filter(function(k){
            return k.id != taskObj.id;
        });
        games[code]["players"][socket.id]["tasks"] = playerTasks;

        if(taskId == "installRam"){
            globalFinishTask("downloadRam", code);
            globalFinishTask("installRam", code);
        }

        addTasksFrom(taskId, code);
        //SEND UPDATE TO ENTIRE ROOM
        io.to(code.toString()).emit("update", games[code]);

        if(totalPoints >= 100){
            io.to(code.toString()).emit("gameOver", true);
        }
    });

    function globalFinishTask(taskId, code){
        var taskObj = tasks["basic"][taskId];
            var taskPoints = taskObj["points"];
            var totalPoints = games[code]["points"]
            totalPoints= parseInt(totalPoints + taskPoints);

            games[code]["points"] = totalPoints;
        for(var p in games[code]["players"]){
            var player = games[code]["players"][p];

            var playerTasks = player["tasks"];

            
   
            playerTasks = playerTasks.filter(function(k){
                return k.id != taskId;
            });
            games[code]["players"][[p]]["tasks"] = playerTasks;

        }
        if(totalPoints >= 100){
            io.to(code.toString()).emit("gameOver", true);
        }
        io.to(code.toString()).emit("globalFinish", taskId);
    }

    function getCode(socket){
        var code = false;

        //Grab the room from the socket
        code = Array.from(socket.rooms)[1];
        if(!code){
            return false;
        }
        roomInt = parseInt(code);
        return roomInt;
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

});


io.listen(6942);
const server = http.createServer(app);
const port = 80;
server.listen(port);

function shuffleArray(a) {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}
function arraysEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length !== b.length) return false;
  
    // If you don't care about the order of the elements inside
    // the array, you should sort both arrays here.
    // Please note that calling sort on an array will modify that array.
    // you might want to clone your array first.
  
    for (var i = 0; i < a.length; ++i) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
  Object.size = function(obj) {
    var size = 0,
      key;
    for (key in obj) {
      if (obj.hasOwnProperty(key)) size++;
    }
    return size;
  };