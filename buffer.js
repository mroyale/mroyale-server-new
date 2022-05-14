class ByteBuffer {
    constructor() {
    }

    assignPid(id, skin, isDev) {
        return new Uint8Array([0x02, id, 0x00, 0x00, skin, isDev])
    }

    serializePlayer(id, level, zone, skin, isDev) {
        return new Uint8Array([0x10, id, 0x00, 0x00, skin, isDev])
    }
}

module.exports = { ByteBuffer };