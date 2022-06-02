class td32 {
    constructor() {
        // Tile Data 32bit // Stored as an int32
    }

    /* returns <Object> */
    reverse(/* td32 */ a) {
        var i = (a >> 16) & 0xFF;
        return { index: a & 0x7FF, bump: (a >> 11) & 0xF, depth: ((a >> 15) & 0x1) === 1, definition: i, data: (a >> 24) & 0xFF };
    }
}

module.exports = { td32 };