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
        this.players = []
    }

    getNextPlayerId() {
        this.lastId += 1;
        return this.lastId;
    }

    addPlayer(player) {
        this.players.push(player);
        return this.getNextPlayerId();
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
        let data = this.getPlayersData();
        for (var i=0; i<this.players.length; i++) {
            let player = this.players[i];

            if (!player.loaded) continue;
            player.sendJSON({"packets": [
                {"players": (data + ([!player.dead ? player.getSimpleData() : []])),
                 "type": "g12"}
            ], "type": "s01"})
        }
    }

    getPlayersData() {
        let playersData = [];
        for (var i=0; i<this.players.length; i++) {
            let player = this.players[i];
            if (!player.loaded || player.dead) continue;

            playersData.push(player.getSimpleData());
        }
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
}

module.exports = { Match };