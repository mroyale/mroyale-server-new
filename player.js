//const { Webhook, MessageBuilder } = require('discord-webhook-node');
const { ByteBuffer } = require('./buffer.js');
const { Shor2 } = require('./util/shor2.js');

class Player {
    constructor(server, name, team, skin, match, mode, isDev) {
        this.client = server;
        this.socket = server.socket;

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

        if (this.name.length === 0) { this.name = this.socket.defaultName };
        if (this.team.length === 0) { this.team = this.socket.defaultTeam };

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
            case 0x10 : /* CREATE_PLAYER_OBJECT */ {
                var level = message[0];
                var zone = message[1];
                var decodedPos = (message[5] & 0xFF) | ((message[4] << 8) & 0xFF00) | ((message[3] << 16) & 0xFF0000) | ((message[2] << 24) & 0xFF0000)
                var pos = {'x': decodedPos & 0xFFFF, 'y': (decodedPos >> 16) & 0xFFFF};

                this.level = level;
                this.zone = zone;
                this.rawPos = decodedPos;
                this.posX = pos.x;
                this.posY = pos.y;
                this.dead = false;

                for (var i=0; i<this.match.players.length; i++) {
                    var player = this.match.players[i];
                    player.client.send(new ByteBuffer().serializePlayer(this.id, this.level, this.zone, decodedPos, this.skin, this.isDev), true);
                }

                break;
            }

            case 0x12 : /* UPDATE_PLAYER_OBJECT */ {
                if (this.dead) return;

                var level = message[0];
                var zone = message[1];
                var sprite = message[10];
                var reverse = (message[11] === 1);

                this.level = level;
                this.zone = zone;
                this.sprite = sprite;

                var b1 = new Uint8Array([message[2], message[3], message[4], message[5]]); // x position
                var v1 = new DataView(b1.buffer); // x position
                var b2 = new Uint8Array([message[6], message[7], message[8], message[9]]); // y position
                var v2 = new DataView(b2.buffer); // y position

                var posX = v1.getFloat32(0);
                var posY = v2.getFloat32(0);
                this.posX = posX;
                this.posY = posY;

                /* Incoming the worst one-liner in all of 2022 */
                this.match.broadPlayerUpdate(this, new Uint8Array([0x12, 0x00, this.id, this.level, this.zone, message[2], message[3], message[4], message[5], message[6], message[7], message[8], message[9], message[10], message[11]]));
                break;
            }

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
                        /*if (!this.match.isPrivate && this.socket.webhookURL !== "") {
                            const webhook = new Webhook(this.socket.webhookURL);
                            const embed = new MessageBuilder().setColor(0xffff00).setTitle(`**${this.name.toUpperCase()}** has achieved **#1** Victory Royale!`).addField('Map', this.match.levelData ? this.match.levelData["shortname"] : this.match.world, true).addField('Mode', mode, true);
                            webhook.send(embed);
                            break;
                        }*/
                    }
                }

                this.match.broadWin(this.id, pos);
                break;
            }

            case 0x19 : /* PLAYER_SNITCH */ {
                if (this.isDev || !this.socket.virginSlayerEnabled) return;

                if (!this.client.blocked) {
                    /*if (this.socket.blockWebhookURL !== "") {
                        const webhook = new Webhook(this.socket.blockWebhookURL);
                        const embed = new MessageBuilder()
                                            .setColor(0x267B8B)
                                            .setTitle(`Player blocked: **${this.name.toUpperCase()}**`)
                                            .addField('Map', this.match.world, true)
                                            .addField('Reason', 'reason packet TBAdded', true);
                        webhook.send(embed);
                    }*/
                    console.log("PLAYER BLOCKED:", this.name.toUpperCase());
                    this.client.blocked = true;
                    this.client.close();
                    break;
                }
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
