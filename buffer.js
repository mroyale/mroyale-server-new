class ByteBuffer {
    constructor() {
    }

    /* returns Uint8Array */
    assignPid(/* int */ id, /* int */ skin, /* bool */ isDev) {
        return new Uint8Array([0x02, 0x00, id, 0x00, skin, isDev])
    }

    /* returns Uint8Array */
    serializePlayer(/* int */ id, /* int */ level, /* int */ zone, /* int */ skin, /* bool */ isDev) {
        return new Uint8Array([0x10, id, 0x00, 0x00, skin, isDev])
    }

    /* returns Uint8Array */
    addCoin(/* None */) {
        return new Uint8Array([0x21, 0x00, 0x00, 0x00, 0x00, 0x00])
    }

    /* returns Uint8Array */
    broadWin(/* int*/ id, /* int */ pos) {
        return new Uint8Array([0x18, id, 0x00, pos, pos, 0x18])
    }

    /* returns Uint8Array */
    createPlayer(/* int */ id, /* byte */ level, /* byte */ zone, /* shor2 */ pos, /* byte */ skin, /* bool */ isDev) {
        return new Uint8Array([0x10, id, 0x00, level, zone, (pos >> 24) & 0xFF, (pos >> 16) & 0xFF, (pos >> 8) & 0xFF, pos & 0xFF, skin, 0x00, isDev]);
    }
}

module.exports = { ByteBuffer };