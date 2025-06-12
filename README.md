# Snake_IO
# multiplayerSnake
Code for multiplayer snake game with [socket.io tutorial](https://www.youtube.com/watch?v=ppcBIHv_ZPs) on the Traversy Media YouTube channel.

If you want to see how to deploy the game check out [this video](https://www.youtube.com/watch?v=M9RDYkFs-EQ)

how to install and run this sample:

1. Install NodeJS then go to server folder and install all packages by using command: npm install

2. start running server by running command in terminal: npx nodemon server.js

3. run client game with live server (VS Code extension) on browser

requirements:

1. Remake the client game using cocos creator by your custom art style and UI //✅
2. Expand game features: 
- 2.1 Add scores label to display both players' scores //✅
- 2.2 Expand to maximum 4 players in a room, the player who create a room having option to input how many players can play in a room, the game will start only having enough players in a room //✅
- 2.3 Add player name input at join / create room and show current player count in a room, then display players' name in room //✅
- 2.4 Create new game rule to win with 4 players: for example count down time and who gets the best score is the 1st winner, or battle area who is the latest survivor in game is the winner //✅
- 2.5 Implement "Quit room" feature so that this quitter will be removed from the in-progress games and get the 0 score then can not join room back  //✅
- 2.6 Show the score table pop up at game over //✅
- 2.7 Create collectible items that having effects (negative or positive) to the player 
- 2.8 Create more maps with different difficulties and grid size to play online with others player
- 2.9 Create feature to play offline with AI players (automatically join the game to having enough player count in a room)
- 2.10 Implement firebase leader board from menu   //✅
- 2.11 Implement player chat feature in game (Nice to have)  //✅
3. Handle lost connection issue in game
4. Handle high ping or delay network issue in game
5. Send the screen shot of game over to save on firebase and display on the leader board thumbnail (Nice to have)

evaluation criteria:
1. 30 score
2. 50 score (each child point: 5 score)
3. 10 score
4. 10 score
5. 10 score

Project passed having from 60 score and understanding what you donegame