const { Vec2 } = require('./vec2.js');

class Shor2 {
    constructor() {
        this.data = 0;
    }

    make(/* short */ a, /* short */ b) {
        return 0 | (parseInt(a) & 0x0000FFFF) | ((parseInt(b) << 16) & 0xFFFF0000);
    }

    reverse(/* shor2 */ a) {
        return Vec2.make(a & 0xFFFF, (a >> 16) & 0xFFFF);
    }
}

module.exports = { Shor2 };