const fs = require('fs');
const mime = require('mime');
const url = require('url');
const util = require('util');
const WebSocketServer = require('websocket').server; // for video


// const server = http.Server(app);  // connects http library to server

// something here added serial


const IP_PORT=8080;

const SerialPort = require('serialport')
const Readline = require('@serialport/parser-readline')

// check to make sure that the user calls the serial port for the arduino when
// running the server
if(!process.argv[2]) {
    console.error('Usage: node '+process.argv[1]+' SERIAL_PORT');
    process.exit(1);
}

// Initialize serial port and create a parser
// initialize the serial port based on the user input
const serialPort = new SerialPort(process.argv[2], { baudRate: 9600 });

// create a parser so that we can easily handle the incoming data by reading the line
const parser = serialPort.pipe(new Readline({
    delimiter: '\n'
}))

serialPort.on("open", () => {
	console.log('serial port open');
});

parser.on('data', console.log);

let server = require('http').createServer(async (req, res) => {
  console.log("Got request!", req.method, req.url);
  
  let path = url.parse(req.url, true).pathname
  
  switch (path) {

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
server.listen(IP_PORT);


let webrtcTransmitter = null;
let webrtcReceivers = new Set();

let wsServer = new WebSocketServer({
  httpServer: server
});

const io = require('socket.io')(wsServer); // socket to client for function calls

wsServer.on('request', (request) => {
  var connection = request.accept(null, request.origin);
  // allConnections.add(connection);
    
  connection.on('message', (msg) => {
    if (msg.type !== 'utf8') {
      return;
    }
    msg = msg.utf8Data;

    let data = JSON.parse(msg);
    console.log(
	"server.js in wsServer.on:",
	"received message:", msg, 
	"message type:", data.type);

    if (data.type == "L") {
	console.log(
		"server.js in wsServer.on:",
		"sending L to Arduino");
	serialPort.write('L');
	}
    if (data.type == "R") {
	console.log(
		"server.js in wsServer.on:",
		"sending R to Arduino");
	serialPort.write('R');
	}
    if (data.type == "F") {
	console.log(
		"server.js in wsServer.on:",
		"sending F to Arduino");
	serialPort.write('F');
	}
    if (data.type == "B") {
	console.log(
		"server.js in wsServer.on:",
		"sending B to Arduino");
	serialPort.write('B');
	}
    if (data.type == "S") {
	console.log(
		"server.js in wsServer.on:",
		"sending S to Arduino");
	serialPort.write('S');
	}
    if (data.type == "+") {
	console.log(
		"server.js in wsServer.on:",
		"sending + to Arduino");
	serialPort.write('+');
	}
    if (data.type == "-") {
	console.log(
		"server.js in wsServer.on:",
		"sending - to Arduino");
	serialPort.write('-');
	}

    if (data.type == "webrtc") {
      console.log("message received: " + data.message);
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

console.log("Listening on port", IP_PORT);
