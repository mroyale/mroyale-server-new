const config = require('./server.json');

class Match {
    constructor(server) {
        this.server = server;

        this.world = "lobby"
        this.closed = false;
        this.playing = false;
        this.autoStartTimer = null;
        this.startingTimer = null;
        this.startTimer = 0;
        this.votes = 0;
        this.winners = 0;
        this.lastId = -1;
        this.players = [];

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
        return this.getNextPlayerId();
    }

    broadJSON(data) {
        for (var i=0; i<this.players.length; i++) {
            var player = this.players[i];
            player.sendJSON(data);
        }
    }

    broadTick() {
        this.broadJSON({"type":"gtk", "ticks": this.ticks, "votes": this.votes, "minPlayers": this.minVotes, "maxPlayers": this.maxPlayers, "voteRateToStart": this.voteRate})
    }

    broadLoadWorld() {
        for (var i=0; i<this.players.length; i++) {
            let player = this.players[i];
            player.loadWorld(this.world);
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
        if (!this.playing) {
            this.autoStartTimer = setTimeout(() => { this.start(); }, 5000)
        }

        if (this.world === "lobby" || !player.lobbier || !this.closed) {
            for (var i=0; i<this.players.length; i++) {
                let player = this.players[i];
                if (!player.loaded) continue;
                //player.sendBin(0x10, player.serializePlayerObject())
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


    }

    tick() {
        if (this.ticks > 0) {
            this.ticks -= 1;
        }
        this.broadTick();
    }
}

module.exports = { Match };