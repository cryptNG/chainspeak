// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title RPGGame
 * @notice A minimal on-chain text-adventure. The updated version never reverts
 *         when a player tries to walk into a non-existent exit or through a
 *         locked door without the proper key; it just returns a message.
 */
contract RPGGame {
    /*─────────────────── Types ───────────────────*/

    enum Direction {
        North,
        East,
        South,
        West
    }

    /// Special marker meaning “no exit in this direction”.
    uint256 private constant NO_EXIT = type(uint256).max;

    struct Room {
        string name;
        string description;
        mapping(Direction => uint256) exits;   // roomId or NO_EXIT
        mapping(Direction => string) doorKey;  // required key to use exit
        string[] objects;                      // items lying in the room
        bool exists;
        bool isExit;                           // winning room flag
    }

    /*─────────────────── Storage ───────────────────*/

    uint256 public bagSize = 2;

    // World layout (immutable after constructor)
    mapping(uint256 => Room) private rooms;

    // Per-player state
    mapping(address => uint256) private currentRoom;  // defaults to 0
    mapping(address => string[]) private bags;

    /*─────────────────── Constructor ───────────────────*/

    constructor() {
        _buildWorld();
    }

    /*─────────────────── External Game API ───────────────────*/

    /// @notice Start (or restart) a game for the caller.
    function newGame() external {
        delete bags[msg.sender];
        currentRoom[msg.sender] = 0;

            // Reset the Key in room 0 if it's missing
        Room storage startingRoom = rooms[0];
        bool hasKey = false;
        for (uint256 i; i < startingRoom.objects.length; ++i) {
            if (_eq(startingRoom.objects[i], "Key")) {
                hasKey = true;
                break;
            }
        }
        if (!hasKey) {
            startingRoom.objects.push("Key");
        }

    }

    /**
     * @notice Look around the current room.
     */
    function look()
        external
        view
        returns (
            string memory roomName,
            string memory description,
            string[] memory exits,
            string[] memory items
        )
    {
        Room storage r = rooms[_playerRoom()];
        roomName = r.name;
        description = r.description;

        // collect exits
        uint256 exitCount;
        for (uint256 i; i < 4; ++i) {
            if (r.exits[Direction(i)] != NO_EXIT) exitCount++;
        }
        exits = new string[](exitCount);
        uint256 j;
        for (uint256 i; i < 4; ++i) {
            if (r.exits[Direction(i)] != NO_EXIT) {
                exits[j++] = _directionToString(Direction(i));
            }
        }

        items = r.objects; // storage → memory copy
    }

    /// @notice List the caller’s bag contents.
    function bag() external view returns (string[] memory) {
        return bags[msg.sender];
    }

    /// @notice Pick up an item lying in the current room (case-insensitive).
function grab(string calldata item)
        external
        returns (bool success, string memory message)
    {
        Room storage r = rooms[_playerRoom()];

        // bag full?
        if (bags[msg.sender].length >= bagSize) {
            return (false, "Bag full");
        }

        // look for item
        for (uint256 i; i < r.objects.length; ++i) {
            if (_eq(r.objects[i], item)) {
                // add to bag
                bags[msg.sender].push(item);
                // remove from room
                r.objects[i] = r.objects[r.objects.length - 1];
                r.objects.pop();
                return (true, "");
            }
        }

        return (false, "Item not found");
    }


    /// @notice Drop an item from the bag into the current room.
    function drop(string calldata item)
        external
        returns (bool success, string memory message)
    {
        Room storage r = rooms[_playerRoom()];
        string[] storage b = bags[msg.sender];

        for (uint256 i; i < b.length; ++i) {
            if (_eq(b[i], item)) {
                // drop into room
                r.objects.push(item);
                // remove from bag
                b[i] = b[b.length - 1];
                b.pop();
                return (true, "");
            }
        }

        return (false, "You don't have that item");
    }

    /**
     * @notice Move in a direction given as a string (e.g. "East").
     * @param dirName  Direction word, case-insensitive.
     * @return moved        True on a successful move
     * @return reachedExit  True iff the destination room is the winning room
     * @return message      Human-readable feedback when the move fails
     */
    function go(string calldata dirName)
        external
        returns (
            bool moved,
            bool reachedExit,
            string memory message
        )
    {
        (bool ok, Direction dir) = _parseDirection(dirName);
        if (!ok) {
            return (false, false, "I cannot move in that direction");
        }
        return _go(dir);
    }

    /*─────────────────── Internal Logic ───────────────────*/

    function _go(Direction dir)
        internal
        returns (
            bool moved,
            bool reachedExit,
            string memory message
        )
    {
        uint256 roomId = _playerRoom();
        uint256 next = rooms[roomId].exits[dir];
        if (next == NO_EXIT) {
            return (false, false, "I cannot move in that direction");
        }

        string memory neededKey = rooms[roomId].doorKey[dir];
        if (bytes(neededKey).length != 0 && !_hasItem(neededKey)) {
            return (
                false,
                false,
                string.concat("I cannot move in that direction, I need a", neededKey)
            );
        }

        // Success!
        currentRoom[msg.sender] = next;
        return (true, rooms[next].isExit, "");
    }

    function _playerRoom() internal view returns (uint256) {
        return currentRoom[msg.sender];
    }

    function _hasItem(string memory item) internal view returns (bool) {
        string[] storage b = bags[msg.sender];
        for (uint256 i; i < b.length; ++i) {
            if (_eq(b[i], item)) return true;
        }
        return false;
    }

    /*─────────────────── World Building ───────────────────*/

    function _buildWorld() internal {
        // room 0 — Living room
        _createRoom(
            0,
            "Living room",
            "A cozy living room with a locked door to the East."
        );
        rooms[0].objects.push("Key");

        // room 1 — Exit
        _createRoom(1, "Exit", "The power of Rootstock. You are free!");
        rooms[1].isExit = true;

        // exits (living room → exit - requires Key)
        _setExit(0, Direction.East, 1, "Key");
    }

    function _createRoom(
        uint256 id,
        string memory name,
        string memory desc
    ) internal {
        Room storage r = rooms[id];
        require(!r.exists, "Room already exists");
        r.name = name;
        r.description = desc;
        r.exists = true;

        // initialise all exits to NO_EXIT so we can test cheaply later
        for (uint256 i; i < 4; ++i) {
            r.exits[Direction(i)] = NO_EXIT;
        }
    }

    function _setExit(
        uint256 fromId,
        Direction dir,
        uint256 toId,
        string memory key
    ) internal {
        rooms[fromId].exits[dir] = toId;
        if (bytes(key).length != 0) {
            rooms[fromId].doorKey[dir] = key;
        }
    }

    /*─────────────────── Helpers ───────────────────*/

    function _directionToString(Direction d)
        internal
        pure
        returns (string memory)
    {
        if (d == Direction.North) return "North";
        if (d == Direction.East) return "East";
        if (d == Direction.South) return "South";
        return "West";
    }

    function _parseDirection(string memory s)
        internal
        pure
        returns (bool ok, Direction dir)
    {
        bytes32 h = keccak256(bytes(_upper(s)));
        if (h == keccak256("NORTH")) return (true, Direction.North);
        if (h == keccak256("EAST")) return (true, Direction.East);
        if (h == keccak256("SOUTH")) return (true, Direction.South);
        if (h == keccak256("WEST")) return (true, Direction.West);
        return (false, Direction.North);
    }

    function _upper(string memory s) internal pure returns (string memory) {
        bytes memory b = bytes(s);
        for (uint256 i; i < b.length; ++i) {
            if (b[i] >= 0x61 && b[i] <= 0x7A) b[i] = bytes1(uint8(b[i]) - 32);
        }
        return string(b);
    }

    function _eq(string memory a, string memory b) internal pure returns (bool) {
        return keccak256(bytes(a)) == keccak256(bytes(b));
    }
}
