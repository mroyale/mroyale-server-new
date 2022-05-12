class ByteBuffer {
    constructor() {
    }

    assignPid() {
        return new Uint8Array([0x02, 0x00, 0x00, 0x00, 0x00, 0x00])
    }
}

module.exports = { ByteBuffer };