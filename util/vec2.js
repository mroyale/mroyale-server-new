class Vec2 {
    constructor() {}

    make(a, b) {
        return {
            'a': a,
            'b': b
        };
    }

    copy(a) {
        return {
            'a': a.x,
            'b': a.b
        };
    }

    add(a, b) {
        return {
            'a': a.x + b.x,
            'b': a.y + b.y
        };
    }
}

module.exports = { Vec2 };