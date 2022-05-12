const WebSocket = require('ws');

const { Player } = require('./player.js');
const { Match } = require('./match.js');
const config = require('./server.json');

const server = new WebSocket.Server({
  port: config.port
});

let sockets = [];
let players = [];
let matches = [];

server.on('connection', function(socket) {
    socket.server = socket;
    socket.address = null; // "";

    socket.pendingStat = null;
    socket.stat = null;
    socket.player = null;
    socket.trustCount = 0;
    socket.blocked = false;

    socket.username = "";

    socket.lastX = 0;
    socket.lastXOk = true;

    socket.dcTimer = null;

    setState("l");

    // When you receive a message, send that message to every socket.
    socket.on('message', function(msg) {
        var data;
        var isBinary;

        try {
            data = getJSON(msg);
            isBinary = false;
        } catch {
            isBinary = true;
        }

        isBinary ? onBinaryMessage() : onTextMessage(data);
    });

    // When a socket closes, or disconnects, remove it from the array.
    socket.on('close', function() {
        if (socket.stat === "g" && socket.player !== null) { console.log("TODO: Figure out removing player from match") }

        sockets = sockets.filter(s => s !== socket);
    });

    /* Functions */
    function onTextMessage(data) {
        if (socket.stat === "l") {
            switch (data.type) {
                case "l00" : /* Input state ready */ {
                    if (socket.pendingStat === null) {
                        socket.close();
                    }

                    let match = new Match(socket);
                    socket.player = new Player(socket, data["name"], data["team"], data["skin"], match, data["gm"], true);
                    players.push(socket.player);
                    loginSuccess();

                    setState("g"); // ingame
                    break;
                }
            }
        } else if (socket.stat === "g") {
            switch (data.type) {
                case "g00" : /* Ingame state ready */ {
                    if (socket.player === null || socket.pendingStat === null) {
                        socket.close();
                        return;
                    }
                    socket.pendingStat = null;
                    socket.player.onEnterIngame();

                    break;
                }

                case "g03" : /* World load complete */ {
                    if (socket.player === null) {
                        if (socket.blocked) {
                            console.log("Bytes don't exist LOL")
                            break;
                        }
                        socket.close();
                        break;
                    }
                    
                    socket.lastXOk = true;
                    socket.player.onLoadComplete();
                    break;
                }

                case "g50" : /* Vote to start */ {
                    if (socket.player === null || socket.player.voted || socket.player.match.playing) break;

                    socket.player.voted = true;
                    socket.player.match.voteStart();

                    break;
                }

                case "g51" : /* FORCE START */ {
                    if (!socket.player.isDev) {
                        socket.close();
                        break;
                    }

                    socket.player.match.start(true)
                }
            }
        }
    }

    function onBinaryMessage() {}

    function loginSuccess() {
        sendJSON({"packets": [
            {"name": socket.player.name, "team": socket.player.team, "skin": socket.player.skin, "type": "l01"}
        ], "type": "s01"})
    }

    function setState(state) {
        socket.stat = socket.pendingStat = state;
        sendJSON({"packets": [
            {"state": state, "type": "s00"}
        ], "type": "s01"})
    };

    function block(reason) {
        socket.blocked = true;
    };

    function sendJSON(data) {
        socket.send(JSON.stringify(data));
    };

    function getJSON(data) {
        return JSON.parse(data);
    };

    sockets.push(socket);
});

console.log("Opened log");