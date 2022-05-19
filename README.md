# mroyale-server-new
Port project of the Mario Royale backend server in node.js
## Progress
- Can create a match
- Can enter lobby
- Can play worlds! (most enemy objects do not work because of the 0xA0 trigger)
- Can display P/V/T on top right of lobby properly
- Can send player information (name, skin, isDev)
- Can auto-start worlds
- Can play gamemodes
- Players can now join the same match
- Can initiate victory sequence
- Can now load levels from server side and client side alike with error handling
## TODO
- Implement object triggers now that levels can be loaded from the server
^ This includes things such as: collecting coins, riding bus platforms, killing enemies, etc..