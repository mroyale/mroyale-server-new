const { ByteBuffer } = require('./buffer.js');
const fs = require('fs');

class Match {
    constructor(server, roomName, isPrivate, mode) {
        this.server = server;
        this.socket = server.socket;

        this.world = "lobby"
        this.closed = false;
        this.playing = false;
        this.roomName = roomName;
        this.isPrivate = isPrivate;
        this.autoStartOn = (this.roomName === "" && this.isPrivate === true ? false : true);
        this.startingTimer = null;
        this.startTimer = 0;
        this.votes = 0;
        this.winners = 0;
        this.lastId = -1;
        this.players = [];
        this.mode = mode;
        this.allowLateEnter = this.socket.allowLateEnter;

        this.tickTimer = setInterval(() => { this.tick(); }, 1000);

        this.maxPlayers = this.socket.maxPlayers;
        this.minVotes = this.socket.minVoters;
        this.voteRate = this.socket.minVotes;
        this.defaultTime = this.socket.defaultTime;
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

    removePlayer(player) {
        for (var i=0; i<this.players.length; i++) {
            if (this.players[i] === player) {
                this.players.splice(i, 1);
            }
        }
        this.players.filter(players => players !== player);
        if (this.mode === 1 /* PvP */ && this.players.length === 1) {
            this.autoStartOn = false;
        }
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
        let data = this.getLevelData();

        for (var i=0; i<this.players.length; i++) {
            let player = this.players[i];
            player.loadWorld(this.world, msg, data);
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

    broadPlayerUpdate(player, packet) {
        for (var i=0; i<this.players.length; i++) {
            var p = this.players[i];
            if (!p.loaded || p.id === player.id) { continue; } /* Don't send to players that aren't loaded, or that the player is ourself. */
            if (p.level !== player.level || p.zone !== player.zone) { continue; } /* Ensure we're sending to players that are in the same area as us. */

            p.client.send(packet, true)
        }
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

        if (!this.playing && this.startingTimer === null && this.players.length >= this.socket.maxPlayers) {
            this.startingTimer = setTimeout(() => { this.start(); }, 3000)
        }
    }

    objectEventTrigger(id, data) {
        for (var i=0; i<this.players.length; i++) {
            var player = this.players[i];
            if (!player.loaded) continue;

            const decoded = data;
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

        var worlds = [];
        var mode = "Vanilla";
        switch (this.mode) {
            case 0 : { worlds = this.socket.worlds; break; }
            case 1 : { worlds = (this.socket.worldsPVP.length !== 0 ? this.socket.worldsPVP : this.socket.worlds); mode = "PVP"; break; }
            case 2 : { worlds = (this.socket.worldsHell.length !== 0 ? this.socket.worldsHell : this.socket.worlds); mode = "Hell"; break; }
            default : { worlds = this.socket.worlds; break; }
        }
        
        this.world = worlds[Math.floor(Math.random() * worlds.length)];
        this.broadLoadWorld();
        setTimeout(() => { this.broadStartTimer(this.socket.startTimer); }, 1000)

        console.log("Starting match [", this.players.length, "players //", this.world, "//", mode, "]")
    }

    tick() {
        if (this.ticks > 0) {
            if (this.autoStartOn && !this.forceStopped) this.ticks -= 1;
        } else {
            this.start();
            clearInterval(this.tickTimer);
        }
        this.broadTick();
    }

    getLevelData() {
        if (fs.existsSync('./worlds/' + this.world + '.json')) {
            const levelData = require('./worlds/' + this.world + '.json')
            this.levelData = levelData;
            return levelData;
        } else {
            return false;
        }

    }
}

module.exports = { Match };
