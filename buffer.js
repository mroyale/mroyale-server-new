class ByteBuffer {
    constructor() {
    }

    assignPid(skin, isDev) {
        return new Uint8Array([0x02, 0x00, 0x00, 0x00, skin, isDev])
    }
}

module.exports = { ByteBuffer };