const fs = require('fs');
const mime = require('mime');
const url = require('url');
const util = require('util');
const WebSocketServer = require('websocket').server;

const PORT=8080;

const { SerialPort } = require('serialport');

// Create an Arduino port
const port = new SerialPort({
  path: '/dev/ttyACM0', // change this depending on Raspberry Pi port: /dev/ttyACM0
  baudRate: 9600, // change this depending on Raspberry Pi baudRate
});

function sendToArduino(message) {
  port.write(message, function(err) {
    if (err) {
      return console.log('Error on write: ', err.message);
    }
    console.log('message written: ', message);
  });
}

port.write('main screen turn on', function(err) {
  if (err) {
    return console.log('Error on write: ', err.message);
  }
  console.log('message written');
});

// Open errors will be emitted as an error event
port.on('error', function(err) {
  console.log('Error: ', err.message)
})

// Read data that is available but keep the stream in "paused mode"
port.on('readable', function () {
  console.log('Data:', port.read())
})

// Switches the port into "flowing mode"
port.on('data', function (data) {
  console.log('Data:', data)
})

let server = require('http').createServer(async (req, res) => {
  console.log("Got request!", req.method, req.url);

  let path = url.parse(req.url, true).pathname

  switch (path) {
    case '/1':
      // goes front etc.
      console.log("Go left");
      sendToArduino("1");
      break;
    case '/2':
      // goes front etc.
      console.log("Go forward");
      sendToArduino("2");
      break;
    case '/3':
      // goes front etc.
      console.log("Go right");
      sendToArduino("3");
      break;
    case '/4':
      // goes front etc.
      console.log("Go back");
      sendToArduino("4");
      break;
    case '/5':
      // goes front etc.
      console.log("Stop");
      sendToArduino("5");
      break;

  // Serve react-built files.
  // - In real production these would be served by nginx or similar.
  // - In dev, they're served by react-stripts.
  // This is for pseudo-production: avoids react-scripts but isn't super efficient.
  default:
    let safePath = path.split('/').filter(e => ! e.startsWith('.')).join('/')
    if (safePath === '/') {
      safePath = '/html/operator.html';
    }
    if (safePath === '/robot') {
      safePath = '/html/robot.html';
    }
    // what is all of this in the try block?
    try {
      let fullPath = 'client' + safePath;
      if ((await util.promisify(fs.stat)(fullPath)).isFile()) {
        res.writeHead(200, {'Content-Type': mime.getType(safePath)});
        fs.createReadStream(fullPath).pipe(res);
      } else {
        console.log("unknown request", path);
        res.writeHead(404, {'Content-Type': 'text/html'});
        res.end("Couldn't find your URL...");
      }
    } catch (err) {
      console.log("Error reading static file?", err);
      res.writeHead(500, {'Content-Type': 'text/html'});
      res.end("Failed to load something...try again later?");
    }
  }
});
server.listen(PORT);


let webrtcTransmitter = null;
let webrtcReceivers = new Set();

let wsServer = new WebSocketServer({
  httpServer: server
});

wsServer.on('request', (request) => {
  var connection = request.accept(null, request.origin);
  // allConnections.add(connection);

  connection.on('message', (msg) => {
    if (msg.type !== 'utf8') {
      return;
    }
    msg = msg.utf8Data;
    // console.log("got message!", msg);
    let data = JSON.parse(msg);
    if (data.type == "webrtc") {
      if ('receiver' in data.message) {
        connection.isTransmitter = data.message.receiver !== false;
        if (connection.isTransmitter) {
          webrtcTransmitter = connection;
        } else {
          connection.clientUuid = data.message.receiver;
          webrtcReceivers.add(connection);
        }
      } else {
        if (connection.isTransmitter) {
          for (c of webrtcReceivers) {
            if (data.message.to === c.clientUuid || ! data.message.to) {
              c.send(JSON.stringify(data));
            }
          }
        } else {
          data.message.from = connection.clientUuid;
          webrtcTransmitter.send(JSON.stringify(data));
        }
      }
    }
  });

  connection.on('close', (conn) => {
    webrtcTransmitter = null;
    webrtcReceivers.delete(conn);
  });
});

console.log("Listening on port", PORT);
