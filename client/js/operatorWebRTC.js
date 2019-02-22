class Listenable {
  constructor() {
    this.listeners = {};
  }
  
  listen(type, listener) {
    if (! this.listeners[type]) {
      this.listeners[type] = new Set();
    }
    this.listeners[type].add(listener);
    return () => this.listeners[type].delete(listener);
  }
  
  notify(type, ...args) {
    for (let listener of (this.listeners[type] || [])) {
      listener(...args);
    }
  }
}

class DataController extends Listenable {
  constructor() {
    super();
    
    this.connect();
    this.messageQueue = [];
  }
  
  connect() {
    this.disconnect();
    
    this.ws = new WebSocket(`ws://${window.location.host}/comm`);
    this.ws.addEventListener('open', (event) => {
      this.connected = true;
      this.notify('connection');
      while (this.messageQueue.length > 0) {
        this.ws.send(this.messageQueue.shift());
      }
    });
    this.ws.addEventListener('message', (message) => {
      let msg = JSON.parse(message.data);
      this.notify(msg.type, msg);
    });
    this.ws.addEventListener('close', () => {
      setTimeout(() => this.connect(), 500);
    });
  }
  
  disconnect() {
    if (this.ws) {
      this.ws.close();
      delete this.ws;
    }
  }
  
  send(type, message) {
    let msg = JSON.stringify({type, message});
    if (this.connected) {
      this.ws.send(msg);
    } else {
      this.messageQueue.push(msg);
    }
  }
}

// WebRTC stuff inspired by https://github.com/shanet/WebRTC-Example/blob/master/client/webrtc.js
const peerConnectionConfig = {
  'iceServers': [
    {'urls': 'stun:stun.stunprotocol.org:3478'},
    {'urls': 'stun:stun.l.google.com:19302'},
  ]
};

// const constraints = { audio: { channelCount: 0 } , video: true };
const constraints = { video: true, audio: false }
// const constraints = window.constraints = { audio: true , video: true };
/*
const 
constraints 
= {
	audio: {
		echoCancellation: {exact: hasEchoCancellation)
	},
	video: {
		true //width: 1280, height: 720
	}
}
*/


class WebrtcTransmitterController extends Listenable {  
  constructor(data) {
    super();
    
    this.data = data;
    data.listen('connection', () => data.send("webrtc", {receiver: false}));
    
    if (data.connected) {
      data.send('webrtc', {receiver: false});
    }
    
    this.connections = {};
  }
  
  async start(video) {
    this.unlisten = this.data.listen('webrtc', (data) => this.handleMessage(data));
    
    try {
      this.stream = await window.navigator.mediaDevices.getUserMedia(constraints);
    } catch (e) {
      alert("Failed to get local video stream, check console for details.");
      console.error("getUserMedia failed", e);
      return;
    }
    console.log("Setting stream", this.stream);
    video.srcObject = this.stream;
  }

  async createConnectionFor(clientId) {
    let pc = this.connections[clientId] = new RTCPeerConnection(peerConnectionConfig);
    pc.onicecandidate = (event) => event.candidate && this.data.send('webrtc', {ice: event.candidate, to: clientId});

    pc.ontrack = () => console.error("Transmitter got remote stream?");
    pc.addStream(this.stream);

    try {
      let description = await pc.createOffer();
      await pc.setLocalDescription(description);
      this.data.send('webrtc', {sdp: pc.localDescription, to: clientId});
    } catch (e) {
      alert("Failed to create and send offer, check console for details.");
      console.error("createOffer or setLocalDescription failed", e);
    }
  }
  
  async handleMessage(data) {
    let msg = data.message;
    if (msg.sdp) {
      try {
        await this.connections[msg.from].setRemoteDescription(new RTCSessionDescription(msg.sdp));
        // if (msg.sdp.type === 'offer') {
        //   let sdp = await this.peerConnection.createAnswer();
        //   await this.peerConnection.setLocalDescription(sdp);
        //   this.data.send('webrtc', {sdp});
        // }
      } catch (e) {
        alert("Failed to connect with remote session, check console for details.");
        console.error("setRemoteDescription failed", e, msg);
      }
    } else if (msg.ice) {
      try {
        await this.connections[msg.from].addIceCandidate(new RTCIceCandidate(msg.ice));
      } catch (e) {
        alert("Failed to add ice candidate, check console for details");
        console.error("addIceCandidate failed", e, msg);
      }
    } else if (msg.offers === "please") {
      this.createConnectionFor(msg.from);
    }
  }
}

class WebrtcReceiverController extends Listenable {
  constructor(data) {
    super();
    
    this.clientId = createUUID();
    this.data = data;
    data.listen('connection', () => data.send("webrtc", {receiver: this.clientId}));
    
    if (data.connected) {
      data.send('webrtc', {receiver: this.clientId});
    }
  }
  
  async start(video) {
    this.unlisten = this.data.listen('webrtc', (data) => this.handleMessage(data));
    
    let pc = this.peerConnection = new RTCPeerConnection(peerConnectionConfig);
    pc.onicecandidate = (event) => event.candidate && this.data.send('webrtc', {ice: event.candidate});
    pc.ontrack = (event) => video.srcObject = event.streams[0];
      
    this.data.send('webrtc', {offers: 'please'});
  }
  
  async handleMessage(data) {
    let msg = data.message;
    if (msg.sdp) {
      try {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        if (msg.sdp.type === 'offer') {
          let sdp = await this.peerConnection.createAnswer();
          await this.peerConnection.setLocalDescription(sdp);
          this.data.send('webrtc', {sdp});
        }
      } catch (e) {
        alert("Failed to connect with remote session, check console for details.");
        console.error("setRemoteDescription failed", e, msg);
      }
    } else if (msg.ice) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(msg.ice));
      } catch (e) {
        alert("Failed to add ice candidate, check console for details");
        console.error("addIceCandidate failed", e, msg);
      }
    }
  }
}

// Taken from http://stackoverflow.com/a/105074/515584
// Strictly speaking, it's not a real UUID, but it gets the job done here
function createUUID() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }

  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}
