class ByteBuffer {
    constructor() {
    }

    /* returns Uint8Array */
    assignPid(/* int */ id, /* int */ skin, /* bool */ isDev) {
        return new Uint8Array([0x02, 0x00, id, 0x00, skin, isDev])
    }

    /* returns Uint8Array */
    addCoin(/* None */) {
        return new Uint8Array([0x21])
    }

    /* returns Uint8Array */
    broadWin(/* int*/ id, /* int */ pos) {
        return new Uint8Array([0x18, 0x00, id, pos, 0x00])
    }

    /* returns Uint8Array */
    serializePlayer(/* int */ id, /* byte */ level, /* byte */ zone, /* shor2 */ pos, /* byte */ skin, /* bool */ isDev) {
        return new Uint8Array([0x10, 0x00, id, level, zone, (pos >> 24) & 0xFF, (pos >> 16) & 0xFF, (pos >> 8) & 0xFF, pos & 0xFF, 0x00, skin, isDev]);
    }
}

module.exports = { ByteBuffer };