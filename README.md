# socket-protect

### **Requirements**

> - Nodejs v8.x
> - Socket.io v2.x

----------

### **Installation**

`npm install socket-protect --save`

----------
### **Options**
> - origin - {Array} - array of allowed origins. Default: [] - allow all
> - ipLimit- {Integer} - Number of allowed connections per ip. Default: 0
> - secure- {Boolean} - true if using https, false if http. Default: true
> - xdomain - {Boolean} - true - allow cross-domain. Default: false
> - debug - {Boolean}- set true to show debuggin messages. Default: false
> - login - {Object}
>  - required - {Boolean} - true if authentication is required. Default: false
>  - loginfn - {Function} - the authentication function that will return a Boolean callback. Default: noop()
>  - timeout - {Number} - The time in ms, before socket is disconnected without authenticating. Default: 3000
> - ddos - {Object}
>  - enabled - {Boolean} - Set true to enable rate limit on all connections. Default: true
>  - timeout - {Number} - Time in ms that must be met before a connection is accepted. Default: 50

```js
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
```
----------

### **API**
> - protectHandshake {Function} - Used for protecting handshake between client and server
> - protectConnect {Function} - Specially used if options.login.required is true.

### **Example**

```js
const app = require('http').createServer(handler);
const io = require('socket.io')(app, {
  pingInterval: 10000,
  pingTimeout: 5000
});
const sp = require('socket-protect');

app.listen(8080, () => {
  console.log('Server listening to port ', 8080);
});

function handler(req, res) {
  res.writeHead(200);
  res.end('Hello World');
}

const auth = (socket, cb) => {
  socket.on('auth', () => {
    cb(true);
  });
};
const protectOpts = {
  origin: ['http://s.bitsler.com'],
  ipLimit: 4,
  secure: true,
  xdomain: true,
  debug: false,
  login: {
    required: true,
    loginfn: auth,
    timeout: 3000 // 3 seconds
  },
  ddos: {
    enabled: true,
    timeout: 500 // 500 ms
  }
};
io.use((socket, next) => {
  sp.protectHandshake(io, socket, protectOpts);
  next();
});
io.on('connection', socket => {
  sp.protectConnect(socket, protectOpts);

  // put your other events
  socket.on('message', data => {
    console.log(data);
  });
});

```

