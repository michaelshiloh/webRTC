# webRTC

**Summary**

A telepresence system based on webRTC and a simple Arduino controlled mobile platform ("robot").

The words "server" and "client" are a little confusing here. "Server" is in fact the web server, 
but it does not serve the video and audio from the robot. 
Instead, one of the clients does.

Two clients are used: One on the robot, one on the remote device. 

The server waits for connections to either its root URL or to the "robot" URL.

**Web client on the robot**
If a web client connects to the "robot" URL the web page 
html/client/robot.html is served, 
which includes the client/js/webrtc.js scripts,
and then presents the video from the remote device via WebRTC.
Video from the robot's camera is sent to the remote device.


**Web client on the remote device**
If a web client connects to the root URL the web page 
html/client/html/operator.html is served, 
which again includes the client/js/webrtc.js scripts,
and presents video from the robot.
This web page also presents buttons for navigating the robot. 
When the operator clicks on a button, this is sent to  TBA


**How to use**

1. Power up the computer on the robot, along with a mouse and keyboard
1. Make sure the robot is connected to the network, and get its IP address
1. Invoke the server with the serial port of the Arduino
```` node server/server.js /dev/ttyACM0````
1. Invoke the client on the robot by browsing to the server's address specifying the "robot" directory:
````localhost:8080/robot````
1. Visit the robot from a remote device, using the IP address of the robot
````IP address:8080````
1. You should see video and hear audio, and navigation buttons should allow you to cause the robot to move

**Known problems**

1. The network is dropped frequently
1. Audio does not work
