# Web_snake
The project is part of VAVJS curriculum. In this work, the mechanism of the game Snake was taken and used to create a web version of it. Here are available different new features, especially multiple users, following a particular user, ranking, music, etc.

Used frameworks and libraries: Express, WebSocket, jQuery.
## Description
The game mechanism was not modified from the original version, but it is now displayed using Canvas instead of HTML tables. 
The game's logic is now located on the server-side. Http server runs on port 8080 and WebSocket server runs on port 8082. The website allows multiple users to play a game at the same time using sessions. The option of registering a new user is added. 
### Ranking
The ranking is available for everyone. Achievements of registered and logged-in users are saved on the server as long as the server runs, achievements of others are stored during the single session only.
### Following
On the main page, there is a table with all active games. Players can follow any of them using respective pin. Using a secret code for a specific game the single snake can be reached and controlled by another user. 
### Administrator
The function of administrating is available. The person with admin rights can see all active games, registered users. An administrator can import and export the data of registered users.
### Additional
Users can save and(or) upload the game in/from the file.
On the main page, players can turn on/off the music.
