const url = require('url');
let totalConnections = 0;
const ipConnectionCounter = {};
let timestampEvent = Date.now();
const noop = () => {};
const defaultOpts = {
  origin: [],
  secure: true,
  xdomain: false,
  debug: false,
  ipLimit: 0,
  login: {
    required: false,
    loginfn: noop,
    timeout: 3000 // 3 seconds
  },
  ddos: {
    enabled: true,
    timeout: 50 // 50 ms
  }
};

const protectHandshake = (io, socket, protectOpts) => {
  const debug = (...args) => {
    if (o.debug) {
      console.log('[Protect]:', args.join(' '));
    }
  };
  const handshake = socket.handshake;
  const o = Object.assign(defaultOpts, protectOpts);
  let allowed = true;
  let ip = '127.0.0.1';
  io.origins((origin, callback) => {
    if (o.origin.length > 0) {
      const urlparts = new url.URL(origin);
      if (!o.origin.includes(urlparts.origin)) {
        allowed = false;
        return callback('forbidden', false);
      }
    }
    if (!origin) {
      debug('origin not allowed');
      allowed = false;
      return callback('forbidden', false);
    }
    callback(null, true);
  });
  if (!allowed) {
    debug('forbidden', socket.id);
    socket.disconnect(true);
    return;
  }
  if (o.secure && !handshake.secure) {
    debug('connected on non secure protocol', socket.id);
    socket.disconnect(true);
    return;
  }

  if (!o.xdomain && handshake.xdomain) {
    debug('cross domain is not allowed');
    socket.disconnect(true);
    return;
  }
  if (o.ddos.enabled) {
    if (Date.now() - timestampEvent < o.ddos.timeout) {
      debug('connecting too fast', socket.id);
      socket.disconnect(true);
      return;
    }
    timestampEvent = Date.now();
  }
  if (o.ipLimit > 0) {
    const val = handshake.headers['cf-connecting-ip'] || socket.request.connection.remoteAddress;
    if (val) {
      const tmp = val.split(/\s*,\s*/)[0];
      if (tmp) ip = tmp;
    }
    const ipConnections = ipConnectionCounter[ip] || 0;
    if (ipConnections > o.ipLimit) {
      debug('Rejecting connection from %s has too many connections', ip);
      debug('Max of', o.ipLimit, 'connections only');
      socket.disconnect(true);
      return;
    }
    ipConnectionCounter[ip] = ipConnections + 1;
    ++totalConnections;
  }

  socket.on('disconnect', () => {
    debug('Socket has disconnected, ip:', ip, 'socket id:', socket.id);
    --ipConnectionCounter[ip];
    --totalConnections;
    debug('Total Connections', totalConnections);
  });
};

const protectConnect = (socket, protectOpts) => {
  const handshake = socket.handshake;
  const ip = handshake.headers['cf-connecting-ip'] || socket.request.connection.remoteAddress;
  const o = Object.assign(defaultOpts, protectOpts);
  if (!o.login.required) return;
  let isAuth = false;
  o.login.loginfn(socket, response => {
    debug('Authenticating', response);
    isAuth = response;
  });
  const debug = (...args) => {
    if (o.debug) {
      console.log('[Protect]:', args.join(' '));
    }
  };
  setTimeout(() => {
    if (!isAuth) {
      debug(`Socket from ${ip} did not join in ${o.login.timeout / 1000} seconds, disconnecting`);

      socket.disconnect(true);
    }
  }, o.login.timeout);
};

module.exports = { protectHandshake, protectConnect };
