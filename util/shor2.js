const { Vec2 } = require('./vec2.js');

class Shor2 {
    constructor() {
        // Two shorts 32bits // Stores as an int32
    }

    /* returns int32 */
    make(/* short */ a, /* short */ b) {
        return 0 | (parseInt(a) & 0x0000FFFF) | ((parseInt(b) << 16) & 0xFFFF0000);
    }

    /* returns <vec2> */
    reverse(/* shor2 */ a) {
        return Vec2.make(a & 0xFFFF, (a >> 16) & 0xFFFF);
    }

    /* returns [x,y] */
    asArray(/* shor2 */ a) {
        return [a & 0xFFFF, (a >> 16) & 0xFFFF];
    }
}

module.exports = { Shor2 };