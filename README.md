# webRTC

**Summary**

A telepresence system based on webRTC and a simple Arduino controlled mobile platform ("robot").

The words "server" and "client" are a little confusing here. "Server" is in fact the web server, 
but it does not serve the video and audio from the robot. 
Instead, one of the clients does.

Two clients are used: One on the robot, one on the remote device. 

The job of the client on the robot is to serve the video and audio, and to interface via the server to the Arduino

The job of the client on the remote device is to complete the audio/video chat, and to provide navigation

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
