const jwt = require('jsonwebtoken');
const { JWT_SECRET_KEY } = process.env;


function createAccessToken(user) {
    const dateExp = new Date();
    dateExp.setHours(new Date().getHours() + 1);
    return jwt.sign(tokenPayLoad(user, 'token', dateExp), JWT_SECRET_KEY);
}

function createRefreshToken(user) {
    const dateExp = new Date();
    dateExp.setMonth(new Date().getMonth() + 1);
    return jwt.sign(tokenPayLoad(user, 'token', dateExp), JWT_SECRET_KEY);
}

function decodeToken(token) {
    return jwt.decode(token, JWT_SECRET_KEY);
}

function tokenPayLoad(user, tokenType = 'token', expiration) {
    return {
        tokenType,
        user,
        iat: new Date().getTime(),
        exp: expiration.getTime()
    }
}

module.exports = {
    createAccessToken,
    createRefreshToken,
    decodeToken
}