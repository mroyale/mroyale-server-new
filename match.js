const config = require('./server.json');
const { ByteBuffer } = require('./buffer.js');

class Match {
    constructor(server, roomName, isPrivate, mode) {
        this.server = server;

        this.world = "lobby"
        this.closed = false;
        this.playing = false;
        this.roomName = roomName;
        this.isPrivate = isPrivate;
        this.autoStartOn = (this.roomName === "" && this.isPrivate === true ? false : true);
        this.autoStartTimer = null;
        this.startingTimer = null;
        this.startTimer = 0;
        this.votes = 0;
        this.winners = 0;
        this.lastId = -1;
        this.players = [];
        this.mode = mode;
        this.allowLateEnter = config.match.allowLateEnter;

        this.tickTimer = setInterval(() => { this.tick(); }, 1000);

        this.maxPlayers = config.match.maxPlayers;
        this.minVotes = config.match.minVotePlayers;
        this.voteRate = config.match.minVoteRate;
        this.defaultTime = config.match.defaultTime;
        this.ticks = this.defaultTime;
    }

    getNextPlayerId() {
        this.lastId += 1;
        return this.lastId;
    }

    addPlayer(player) {
        this.players.push(player);
        this.ticks = this.defaultTime;
        return this.getNextPlayerId();
    }

    getPlayer(id) {
        for (var i=0; i<this.players.length; i++) {
            var player = this.players[i];
            if (player.id === id) return player;
        }
    }

    getWinners() {
        this.winners += 1;
        return this.winners;
    }

    broadJSON(data) {
        for (var i=0; i<this.players.length; i++) {
            var player = this.players[i];
            player.sendJSON(data);
        }
    }

    broadBin(code, buff, ignore=false) {
        for (var i=0; i<this.players.length; i++) {
            var player = this.players[i];
            if (!player.loaded || (ignore !== false && player.id === ignore)) {
                return;
            }

            player.sendBin(code, [buff[0], buff[1], buff[2], buff[3], buff[4]])
        }
    }

    broadWin(id, pos) {
        for (var i=0; i<this.players.length; i++) {
            var player = this.players[i];
            if (!player.loaded) return;
            player.client.send(new ByteBuffer().broadWin(id, pos), true)
        }
    }

    broadTick() {
        this.broadJSON({"type":"gtk", "ticks": this.ticks, "votes": this.votes, "minPlayers": this.minVotes, "maxPlayers": this.maxPlayers, "voteRateToStart": this.voteRate})
    }

    getLoadMsg() {
        var msg = { "game": this.world, "type": "g01" };
        return JSON.stringify(msg);
    }

    broadLoadWorld() {
        let msg = this.getLoadMsg();
        for (var i=0; i<this.players.length; i++) {
            let player = this.players[i];
            player.loadWorld(this.world, msg);
        }
    }

    broadStartTimer(time) {
        this.startTimer = time * 30;

        for (var i=0; i<this.players.length; i++) {
            var player = this.players[i];
            if (!player.loaded) continue;

            player.setStartTimer(this.startTimer);
        }

        if (time > 0) {
            setTimeout(() => {
                this.broadStartTimer(time - 1);
            }, 1000)
        } else {
            this.closed = true;
        }
    }

    broadPlayerList() {
        let devOnly = this.playing;   // Don't broad player list when in main game
        let playersData = this.getPlayersData(false);
        let playersDataDev = this.getPlayersData(true);
        let data = {"packets": [
            {"players": playersData,
             "type": "g12"}
        ], "type": "s01"}
        let dataDev = {"packets": [
            {"players": playersDataDev,
             "type": "g12"}
        ], "type": "s01"}
        for (var i=0; i<this.players.length; i++) {
            var player = this.players[i];
            if (player.isDev || !devOnly) {
                if (!player.loaded) continue;
                player.sendJSON(player.isDev ? dataDev : data)
            }
        }
    }

    getPlayersData(isDev) {
        let playersData = []
        for (var i=0; i<this.players.length; i++) {
            let player = this.players[i];
            // We need to include even not loaded players as the remaining player count
            // only updates on the start timer screen
            playersData.push(player.getSimpleData(isDev))
        }
        return playersData
    }

    onPlayerReady(player) {
        if (!this.playing) { }

        if (this.world === "lobby" || !player.lobbier || !this.closed) {
            for (var i=0; i<this.players.length; i++) {
                let player = this.players[i];
                if (!player.loaded) continue;
                this.server.send(player.serializePlayerObject(), true);
            }

            if (this.startTimer !== 0 || this.closed) {
                player.setStartTimer(this.startTimer);
            }
        }

        this.broadPlayerList();

        if (!this.playing && this.startingTimer === null && this.players.length >= 5) {
            this.startingTimer = setTimeout(() => { this.start(); }, 3000)
        }
    }

    voteStart() {
        this.votes += 1;

        if (!this.playing && this.votes >= this.players.length * 0.85) {
            this.start();
        }
    }

    start(forced=false) {
        if (this.playing) return;
        this.playing = true;

        var worlds = []
        switch (this.mode) { /* TODO: use actual worlds from gamemode */
            case 0 : { worlds = config.worlds.royale; break; }
            case 1 : { worlds = config.worlds.royale; break; }
            case 2 : { worlds = config.worlds.royale; break; }
            default : { worlds = config.worlds.royale; break; }
        }

        this.world = worlds[Math.floor(Math.random() * worlds.length)];
        this.broadLoadWorld();
        setTimeout(() => { this.broadStartTimer(config.match.startTimer); }, 1000)

        console.log("Starting")
    }

    tick() {
        if (this.ticks > 0) {
            if (this.autoStartOn) this.ticks -= 1;
        } else {
            this.start();
            clearInterval(this.tickTimer);
        }
        this.broadTick();
    }
}

module.exports = { Match };