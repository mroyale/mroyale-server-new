class ByteBuffer {
    constructor() {
    }

    /* returns Uint8Array */
    assignPid(/* int */ id, /* int */ skin, /* bool */ isDev) {
        return new Uint8Array([0x02, (id >> 8) & 0xFF, (id >> 0) & 0xFF, (skin >> 8) & 0xFF, (skin >> 0) & 0xFF, isDev])
    }

    /* returns Uint8Array */
    addCoin(/* None */) {
        return new Uint8Array([0x21])
    }

    /* returns Uint8Array */
    broadWin(/* int*/ id, /* int */ pos) {
        return new Uint8Array([0x18, (id >> 8) & 0xFF, (id >> 0) & 0xFF, pos, 0x00])
    }

    /* returns Uint8Array */
    serializePlayer(/* int */ id, /* byte */ level, /* byte */ zone, /* shor2 */ pos, /* byte */ skin, /* bool */ isDev) {
        return new Uint8Array([0x10, (id >> 8) & 0xFF, (id >> 0) & 0xFF, level, zone, (pos >> 24) & 0xFF, (pos >> 16) & 0xFF, (pos >> 8) & 0xFF, pos & 0xFF, (skin >> 8) & 0xFF, (skin >> 0) & 0xFF, isDev]);
    }
}

module.exports = { ByteBuffer };