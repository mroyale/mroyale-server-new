const WebSocket = require('ws');

const { Player } = require('./player.js');
const { Match } = require('./match.js');

const server = new WebSocket.Server({
  port: 9000
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
        let data = getJSON(msg);

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
            }
        }
    });

    // When a socket closes, or disconnects, remove it from the array.
    socket.on('close', function() {
        if (socket.stat === "g" && socket.player !== null) { console.log("TODO: Add match class") }

        sockets = sockets.filter(s => s !== socket);
    });

    /* Functions */
    function loginSuccess() {
        sendJSON({"packets": [
            {"name": socket.player.name, "team": socket.player.team, "skin": socket.player.skin, "sid": "i-dont-know-for-what-this-is-used", "type": "l01"}
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