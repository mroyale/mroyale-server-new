const { ByteBuffer } = require('./buffer.js');

class Player {
    constructor(server, name, team, skin, match, mode, isDev) {
        this.client = server;
        this.name = name;
        this.team = team;
        this.skin = skin;
        this.match = match;
        this.mode = mode;
        this.isDev = isDev;

        if (this.name.toLowerCase() in ["terminalkade", "casini loogi", "dimension", "nightcat"]) {
            this.isDev = true;
        }

        if (this.name.length === 0) { this.name = "MARIO" };

        this.pendingWorld = null;

        this.level = 0;
        this.zone = 0;

        this.posX = 0;
        this.posY = 0;
        this.dead = true;
        this.win = false;
        this.voted = false;
        this.loaded = false;
        this.lobbier = false;
        this.lastUpdatePkt = false;

        this.wins = 0;
        this.deaths = 0;
        this.kills = 0;
        this.coins = 0;

        this.trustCount = 0;
        this.lastX = this.posX;
        this.lastXOk = true;

        this.id = 0;
    }

    sendJSON(data) {
        this.client.send(JSON.stringify(data));
    }

    sendText(data) {
        this.client.send(data);
    }

    sendBin(code, buff) {
        let msg
        this.client.send();
    }

    getSimpleData(isDev) {
        let data = {"id": this.id, "name": this.name, "team": this.team, "isDev": this.isDev, "isGuest": this.client.username.length === 0}
        if (isDev) data["username"] = this.client.username;
        return data;
    }

    serializePlayerObject() {
        return ByteBuffer().writeInt16(this.id).writeInt8(this.level).writeInt8(this.zone).writeShor2(this.posX, this.posY).toBytes()
    }

    sendLevelSelect() {
        this.sendJSON([{'shortId': 'SN', 'longId': 'world-sn.json'}]);
    }

    setStartTimer(time) {
        this.sendJSON({"packets": [
            {"time": time, "type": "g13"}
        ], "type": "s01"})
    }

    loadWorld(worldName) {
        this.dead = true;
        this.loaded = false;
        this.pendingWorld = worldName;
        this.sendJSON({"packets": [
            {"game": worldName, "type": "g01"}
        ], "type": "s01"})
    }

    onEnterIngame() {
        if (!this.dead) return;

        if (this.match.world == "lobby") {
            this.lobbier = true;
        }

        this.loadWorld(this.match.world);
    }

    onLoadComplete() {
        if (this.loaded || this.pendingWorld !== null) return;

        this.level = 0;
        this.zone = 0;
        this.posX = 35;
        this.posY = 3;
        this.win = false;
        this.dead = false;
        this.loaded = true;
        this.pendingWorld = null;

        console.log("ASSIGN PID HERE!!!");

        this.match.onPlayerReady(this);
    }
}

module.exports = { Player };