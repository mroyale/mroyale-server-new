const WebSocket = require('ws');

const { Player } = require('./player.js');
const { Match } = require('./match.js');
const config = require('./server.json');

const server = new WebSocket.Server({
  port: config.port
});

let sockets = []; // connected users
let players = []; // in-game players
let matches = []; // public matches
let authd = []; // authenticated users

server.on('connection', function(socket) {
    let self = socket;

    self.server = socket;
    self.address = null; // "";

    self.pendingStat = null;
    self.stat = null;
    self.player = null;
    self.trustCount = 0;
    self.blocked = false;

    self.username = "";

    self.lastX = 0;
    self.lastXOk = true;

    self.dcTimer = null;

    setState("l");

    socket.on('message', function(msg) {
        var data;
        var isBinary;

        try {
            data = getJSON(msg);
            isBinary = false;
        } catch {
            isBinary = true;
        }

        isBinary ? onBinaryMessage(msg) : onTextMessage(data);
    });

    // When a socket closes, or disconnects, remove it from the array.
    socket.on('close', function() {
        if (self.stat === "g" && self.player !== null && self.player.match !== undefined) {
            players = players.filter(ply => ply !== self.player);
        }

        sockets = sockets.filter(s => s !== socket);
    });

    /* Functions */
    function onTextMessage(data) {
        if (self.stat === "l") {
            switch (data.type) {
                case "l00" : /* Input state ready */ {
                    if (self.pendingStat === null) {
                        self.close();
                    }

                    self.player = new Player(self, data["name"], data["team"], data["skin"], getMatch(data["team"], data["private"], data["gm"]), data["gm"], false);
                    players.push(self.player);
                    loginSuccess();

                    setState("g"); // ingame
                    break;
                }

                case "llg" : /* Login */ {
                    if (authd.includes(data["username"])) {
                        sendJSON({"type":"llg", "status":false, "msg": "account already in use"})
                    }

                    let msg = {"type": "llg", "status": true, "msg": {"username":data["username"],"nickname":data["username"], "coins":420, "skins":[0,1,2,3], "skin":0}}
                    self.username = data["username"];
                    sendJSON(msg);
                    break;
                }

                case "llo" : /* Logout */ {
                    /*
                        Sessions aren't being stored yet,
                        so just remove name from authd.
                        *TODO: Store sessions.*
                    */
                    if (!self.username) return;

                    for (var i=0; i<authd.length; i++) {
                        if (authd[i] === self.username) {
                            authd.splice(i, 1);
                        }
                    }

                    break;
                }
            }
        } else if (self.stat === "g") {
            switch (data.type) {
                case "g00" : /* Ingame state ready */ {
                    if (self.player === null || self.pendingStat === null) {
                        self.close();
                        return;
                    }
                    self.pendingStat = null;
                    self.player.onEnterIngame();

                    break;
                }

                case "g03" : /* World load complete */ {
                    if (self.player === null) {
                        if (self.blocked) {
                            console.log("Bytes don't exist LOL")
                            break;
                        }
                        self.close();
                        break;
                    }
                    
                    self.lastXOk = true;
                    self.player.onLoadComplete();
                    break;
                }

                case "g50" : /* Vote to start */ {
                    if (self.player === null || self.player.voted || self.player.match.playing) break;

                    self.player.voted = true;
                    self.player.match.voteStart();

                    break;
                }

                case "g51" : /* FORCE START */ {
                    if (!self.player.isDev) {
                        self.close();
                        break;
                    }

                    self.player.match.start(true)
                }
            }
        }
    }

    function onBinaryMessage(data) {
        const CODE_LENGTH = { 0x10: 6, 0x11: 0, 0x12: 12, 0x13: 1, 0x17: 2, 0x18: 4, 0x19: 0, 0x20: 7, 0x30: 7 }
        const code = data[0];
        
        if(!(code in CODE_LENGTH) && code !== undefined) {
            console.error("PACKET NOT AVAILABLE: " + code);
            return;
        }

        let length = CODE_LENGTH[code] + 1;
        if (data.length < length) {
            console.log("LENGTH CHECK FAILED");
            return;
        }

        data = data.slice(1);

        self.player.handleBinary(code, data);
    }

    function getMatch(roomName, isPrivate, gameMode) {
        if (isPrivate && roomName === "") /* Make new match for offline mode */ {
            return new Match(socket, "", "", gameMode);
        }

        let fmatch = null;
        for (var i=0; i<matches.length; i++) {
            var match = matches[i];
            if (!match.closed && match.players.length < config.match.maxPlayers && gameMode === match.mode && isPrivate === match.isPrivate) {
                if (!match.allowLateEnter && match.playing) {
                    continue;
                }
                fmatch = match;
                break;
            }
        }

        if (fmatch === null) {
            fmatch = new Match(socket, roomName, isPrivate, gameMode);
            matches.push(fmatch);
        }

        return fmatch;
    }

    function removeMatch(match) {
        matches = matches.filter(match => match !== match);
    }

    function loginSuccess() {
        sendJSON({"packets": [
            {"name": self.player.name, "team": self.player.team, "skin": self.player.skin, "type": "l01"}
        ], "type": "s01"})
    }

    function setState(state) {
        self.stat = self.pendingStat = state;
        sendJSON({"packets": [
            {"state": state, "type": "s00"}
        ], "type": "s01"})
    };

    function block(reason) {
        self.blocked = true;
    };

    function sendJSON(data) {
        self.send(JSON.stringify(data));
    };

    function getJSON(data) {
        return JSON.parse(data);
    };

    sockets.push(self);
});

console.log("Opened log");