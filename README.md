# mroyale-server-new
Port project of the Mario Royale backend server in node.js
## Progress
- Can create a match
- Can enter lobby
- Can play worlds! (most enemy objects do not work because of the 0xA0 trigger)
- Can load worlds from server and client alike
- Can somewhat broad player state
- Can somewhat sync other player's data
## Ghost Info
Recently I have finally gained better knowledge of binary data, how the game uses them, and things like that.<br>
Packet 0x12 can now properly send player data to other players, somewhat.<br>
There are some weird exceptions but I'm happy to make progress, I still need to figure out tile event triggers, object event triggers, proper skin support, fixing private matches and other things like that.