class ByteBuffer {
    constructor(data) {
        this.buffer = data;
    }

    write(data) {
        this.buffer += data;
        return this;
    }

    read(length=1) {
        let data = this.buffer.length;
        this.buffer = this.buffer[length]
        return data;
    }
}

module.exports = { ByteBuffer };