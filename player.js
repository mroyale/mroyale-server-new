const { ByteBuffer } = require('./buffer.js');
const config = require('./server.json');
const { Webhook, MessageBuilder } = require('discord-webhook-node');

class Player {
    constructor(server, name, team, skin, match, mode, isDev) {
        this.client = server;
        this.name = name;
        this.team = team;
        this.skin = skin;
        this.match = match;
        this.mode = mode;
        this.isDev = isDev;

        let developers = ["terminalarch", "casini loogi", "dimension", "nightcat"];
        if (developers.includes(this.client.username.toLowerCase())) {
            this.isDev = true;
        }

        if (this.name.length === 0) { this.name = config.game.defaultName };
        if (this.team.length === 0) { this.team = config.game.defaultTeam };

        this.team = this.team.toUpperCase();
        this.team.length > 3 ? this.team.length = 3 : this.team.length;

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

        this.id = match.addPlayer(this);
    }

    sendJSON(data) {
        this.client.send(JSON.stringify(data));
    }

    sendText(data) {
        this.client.send(data);
    }

    sendBin(code, buff) {
        let msg = new Uint8Array([code, buff[0], buff[1] || 0x00, buff[2] || 0x00, buff[3] || 0x00, buff[4] || 0x00])
        this.client.send(msg, true);
    }

    getSimpleData(isDev) {
        let data = {"id": this.id, "name": this.name, "team": this.team, "isDev": this.isDev, "isGuest": this.client.username.length === 0}
        if (isDev) data["username"] = this.client.username;
        return data;
    }

    serializePlayerObject() {
        return new ByteBuffer().serializePlayer(this.id, this.level, this.zone, this.skin, this.isDev);
    }

    sendLevelSelect() {
        this.sendJSON({"type":"gll", "levels": [{shortId:"SN",longId:"world-1.json"}]});
    }

    setStartTimer(time) {
        this.sendJSON({"packets": [
            {"time": time, "type": "g13"}
        ], "type": "s01"})
    }

    loadWorld(worldName, loadMsg, levelData) {
        this.dead = true;
        this.loaded = false;
        this.pendingWorld = worldName;
        
        if (levelData) {
            this.sendJSON({"packets": [
                { "game": "custom", "levelData": JSON.stringify(levelData), "type": "g01" }
            ], "type": "s01"})
        } else {
            this.sendJSON({"packets": [
                JSON.parse(loadMsg)
            ], "type": "s01"})
        }
    }

    onEnterIngame() {
        if (!this.dead) return;

        if (this.match.world == "lobby") {
            if (this.isDev) this.sendLevelSelect();
            this.lobbier = true;
        }

        this.loadWorld(this.match.world, this.match.getLoadMsg(), this.match.getLevelData());
    }

    onLoadComplete() {
        //if (this.loaded || this.pendingWorld !== null) return;

        this.level = 0;
        this.zone = 0;
        this.posX = 35;
        this.posY = 3;
        this.win = false;
        this.dead = false;
        this.loaded = true;
        this.pendingWorld = null;

        this.client.send(new ByteBuffer().assignPid(this.id, this.skin, this.isDev), true);

        this.match.onPlayerReady(this);
    }

    handleBinary(code, message) /* NETX_DECODE */ {
        switch (code) {
            case 0x10 : /* CREATE_PLAYER_OBJECT */ { break; }
            case 0x18 : /* PLAYER_REQUEST_RESULT */ {
                if (this.dead || this.win) { break; }

                this.win = true;

                let pos = this.match.getWinners();
                var mode = this.match.mode;
                switch (mode) {
                    case 0x00 : { mode = "Vanilla"; break; }
                    case 0x01 : { mode = "PVP"; break; }
                    case 0x02 : { mode = "Hell"; break; }
                }
                switch(pos) {
                    case 0x01 : {
                        if (!this.match.isPrivate && config.webhookURL !== "") {
                            const webhook = new Webhook(config.webhookURL);
                            const embed = new MessageBuilder().setColor(0xffff00).setTitle(`**${this.name.toUpperCase()}** has achieved **#1** Victory Royale!`).addField('Map', this.match.levelData ? this.match.levelData["shortname"] : this.match.world, true).addField('Mode', mode, true);
                            webhook.send(embed);
                            break;
                        }
                    }
                }

                this.match.broadWin(this.id, pos);
                break;
            }

            case 0x20 : /* OBJECT_EVENT_TRIGGER */ {
                if (this.dead) return;

                this.match.objectEventTrigger(this.id, message);

                break;
            }

            case 0x21 : /* GET_COINS */ {
                // This packet is sent when the player object spawns for whatever reason.
                // It has no ingame use and it's not even implemented in PyRoyale, but i'll just make this send the coin count.

                this.client.send(new Uint8Array([0x21, 0x00, this.coins, 0x00, 0x00, 0x00]));
                break;
            }
        }
    }

    addCoin() {
        if (!this.lobbier) {
            this.coins += 1;
        }

        this.client.send(new ByteBuffer().addCoin(), true);
    }
}

module.exports = { Player };