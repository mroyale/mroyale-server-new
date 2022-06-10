# mroyale-server-new
Project to port the Mario Royale websocket server to node.js using the [ws](https://github.com/websockets/ws) module.<br>
**NOTE:** This project is on hold until Mario Royale v4.5.0 is completed, estimated time is unknown.

## Progress
- Can create a match
- Can enter lobby
- Can play worlds!
- Can load worlds from server and client alike
- Can broad player states and info
- Can interact with objects
- Objects can sync across clients
- Can interact with tiles
- Tiles can sync across clients
- Can collect coins from the world and question blocks
- Can send coin/1UP notices when touching flagpoles with extra data, or when dying, and winning
## Summary
The server rewrite is currently in a very playable state. There are some issues left to account for and some things to add, but now I'm happy with where it's at.
## TODO
- Actual banning (will need to find a way to get IP somehow)
- "Hurry up!" mode
- Accounts (also use NoSQL database)
