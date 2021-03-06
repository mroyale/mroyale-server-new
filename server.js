const WebSocket = require('ws');
let Captcha = require('nodejs-captcha');
const fs = require('fs');

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

server.on('connection', function(socket, req) {
    let self = socket;

    self.server = socket;
    self.socket = factory;
    self.controller = new RoyaleController(socket);
    self.address = req.socket.remoteAddress;
    self.account = null;
    self.username = "";

    self.pendingStat = null;
    self.stat = null;
    self.player = null;
    self.trustCount = 0;
    self.blocked = false;

    self.lastX = 0;
    self.lastXOk = true;

    self.dcTimer = null;

    self.controller.setState("l"); // login

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
        if (self.stat === "g" && self.player !== null) {
            players = players.filter(ply => ply !== self.player);
            if (self.player.match.players.length - 1 === 0) removeMatch(self.player.match)
            self.player.match.removePlayer(this);
        }

        if (self.player) {
            self.player.match = null;
            self.player = null;
            self.pendingStat = null;
            self.stat = "";
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

                    self.player = new Player(self, data["name"], data["team"], data["skin"], self.controller.getMatch(data["team"], data["private"], data["gm"]), data["gm"], false);
                    players.push(self.player);
                    self.controller.loginSuccess();

                    self.controller.setState("g"); // ingame
                    break;
                }

                case "llg" : /* Login */ {
                    if (self.username !== "" || self.account) {
                        socket.close();
                    }

                    if (authd.includes(data["username"])) {
                        self.controller.sendJSON({"type":"llg", "status":false, "msg": "account already in use"})
                    }

                    let msg = {"type": "llg", "status": true, "msg": {"username":data["username"],"nickname":data["username"], "squad": "lol", "coins":420, "skins":[0,1,2,3], "skin":0}}
                    self.username = data["username"];
                    self.account = msg["msg"];
                    authd.push(data["username"])

                    self.controller.sendJSON(msg);
                    break;
                }

                case "lrc" : /* Request Captcha */ {
                    let data = Captcha();
                    data.value = data.value.toUpperCase();

                    /* WARNING: nodejs-captcha data always starts data with data:image, so the client will soon be updated to account for this. */
                    let msg = {"type":"lrc", "data":data.image}

                    self.controller.sendJSON(msg);
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
                    break;
                }

                case "gst" : /* TOGGLE TIMER (future proof) */ {
                    if (!self.player.isDev) {
                        self.close();
                        break;
                    }
                    
                    self.player.match.autoStartOn = !self.player.match.autoStartOn;
                    self.player.match.forceStopped = !self.player.match.forceStopped;
                    break;
                }
            }
        }
    }

    function onBinaryMessage(data) {
        const CODE_LENGTH = { 0x10: 6, 0x11: 0, 0x12: 12, 0x13: 1, 0x17: 2, 0x18: 4, 0x19: 0, 0x20: 7, 0x21: 7, 0x30: 7 }
        const code = data[0];
        

        let length = CODE_LENGTH[code] + 1;
        if (data.length < length) {
            console.log("LENGTH CHECK FAILED");
            return;
        }

        data = data.slice(1);

        self.player.handleBinary(code, data);
    }

    function removeMatch(match) {
        matches = matches.filter(match => match !== match);
    }

    function getJSON(data) {
        return JSON.parse(data);
    };

    sockets.push(self);
});

class RoyaleController {
    constructor(server) {
        this.server = server;
    }

    sendJSON(data) {
        this.server.send(JSON.stringify(data));
    };

    setState(state) {
        this.server.stat = this.server.pendingStat = state;
        this.sendJSON({"packets": [
            {"state": state, "type": "s00"}
        ], "type": "s01"})
    }

    loginSuccess() {
        this.sendJSON({"packets": [
            {"name": this.server.player.name, "team": this.server.player.team, "skin": this.server.player.skin, "type": "l01"}
        ], "type": "s01"})
    }

    getMatch(roomName, isPrivate, gameMode) {
        if (isPrivate && roomName === "") /* Make new match for offline mode */ {
            return new Match(socket, "", "", gameMode);
        }

        let fmatch = null;
        for (var i=0; i<matches.length; i++) {
            var match = matches[i];
            if (!match.closed && match.players.length < 75 && gameMode === match.mode && isPrivate === match.isPrivate) {
                if (!match.allowLateEnter && match.playing) {
                    continue;
                }
                fmatch = match;
                break;
            }
        }

        if (fmatch === null) {
            fmatch = new Match(this.server, roomName, isPrivate, gameMode);
            matches.push(fmatch);
        }

        return fmatch;
    }
}

class RoyaleSocket {
    constructor() {
        this.log = false;
        this.virginSlayerEnabled = false;

        this.updateConfig();
        this.readConfig();
        setInterval(() => this.generalUpdate(), 5000);
    }

    readConfig() {
        fs.watch('./server.json', (eventName, filename) => {
            if (!filename) console.error("There was a problem trying to read the config file.");

            this.updateConfig();
        })
    }

    updateConfig() {
        try {
            let configFile = fs.readFileSync('./server.json');
            configFile = JSON.parse(configFile);

            this.webhookURL = configFile["webhookURL"];
            this.blockHookURL = configFile["blockWebhookURL"];
            this.statusPath = configFile.main["statusURL"];

            this.defaultName = configFile.game["defaultName"];
            this.defaultTeam = configFile.game["defaultTeam"];

            this.maxPlayers = configFile.match["maxPlayers"];
            this.minVoters = configFile.match["minVotePlayers"];
            this.minVotes = configFile.match["minVoteRate"];
            this.defaultTime = configFile.match["defaultTime"];
            this.startTimer = configFile.match["startTimer"];
            this.allowLateEnter = configFile.match["allowLateEnter"];

            this.worlds = configFile.worlds["royale"];
            this.worldsPVP = configFile.worlds["pvp"];
            this.worldsHell = configFile.worlds["hell"];

            console.log("Updated configuration successfully.");
        } catch(e) {
            console.error("Could not update configuration\n" + e)
        }
    }

    generalUpdate() {
        if (this.log) console.log("Players online:", players.length, "//", "Active matches:", matches.length);

        if (!fs.existsSync(this.statusPath)) return;

        let obj = {"active": players.length, "maintenance": false};
        fs.writeFileSync(this.statusPath, JSON.stringify(obj), (err) => {});
    }
}

let factory = new RoyaleSocket();
console.log("Log opened.");