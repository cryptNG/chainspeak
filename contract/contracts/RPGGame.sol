// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract RPGGame {
    enum Direction { North, East, South, West }
    uint256 private constant NO_EXIT = type(uint256).max;

    struct Room {
        mapping(Direction => uint256) exits;
        mapping(Direction => string) doorKey;
        string[] objects;
        bool exists;
        bool isExit;
    }
    struct Subregion { uint256 x; uint256 y; uint256 w; uint256 h; }
    struct Edge { uint256 r1; uint256 r2; bool horiz; }

    struct Game {
        mapping(uint256 => Room) rooms;
        Subregion[] regs;
        uint256[] leaves;
        Edge[] edges;
        uint256 roomCount;
        uint256 itemCount;
        uint256 bagSize;
        uint256 curRoom;
        string[] bag;
        bool exists;
    }

    mapping(address => Game) private g;

    function newGame() external {
        delete g[msg.sender];
        Game storage G = g[msg.sender];
        G.roomCount = 10;
        G.itemCount = 3;
        G.bagSize = 3;
        G.exists = true;
        G.curRoom = 0;
        _gen(msg.sender);
    }

    function look()
        external
        view
        returns (uint256 roomId, string[] memory exits, string memory lockedStr, string[] memory objects)
    {
        require(g[msg.sender].exists, "No active game");
        Game storage G = g[msg.sender];
        roomId = G.curRoom;
        Room storage R = G.rooms[roomId];
        uint256 cnt;
        for (uint256 d; d < 4; ++d) {
            if (R.exits[Direction(d)] != NO_EXIT) cnt++;
        }
        exits = new string[](cnt);
        uint256 j;
        for (uint256 d; d < 4; ++d) {
            if (R.exits[Direction(d)] != NO_EXIT) exits[j++] = _toStr(Direction(d));
        }
       bytes memory buf;
       bool first;
       for (uint256 d; d < 4; ++d) {
           uint256 to = R.exits[Direction(d)];
           if (to != NO_EXIT) {
               string memory neededKey = R.doorKey[Direction(d)];
               // if there _is_ a key on that exit AND the player does not have it
               if (bytes(neededKey).length != 0 && !_hasKey(msg.sender, neededKey)) {
                   if (!first) {
                       buf = abi.encodePacked(buf, ",");
                   }
                   // Show direction + actual key name rather than "[Locked]"
                   buf = abi.encodePacked(
                       buf,
                       _toStr(Direction(d)),
                       "[Key: ",
                       neededKey,
                       "]"
                   );
                   first = false;
               }
           }
       }
       lockedStr = string(buf);
        objects = R.objects;
    }

    function bag() external view returns (string[] memory) {
        require(g[msg.sender].exists, "No active game");
        return g[msg.sender].bag;
    }

    function grab(string calldata itm) external returns (bool, string memory) {
        if (!g[msg.sender].exists) return (false, "Game not started");
        Game storage G = g[msg.sender];
        Room storage R = G.rooms[G.curRoom];
        if (G.bag.length >= G.bagSize) return (false, "Bag full");
        string memory up = _upper(itm);
        for (uint256 i; i < R.objects.length; ++i) {
            if (_eq(_upper(R.objects[i]), up)) {
                G.bag.push(R.objects[i]);
                R.objects[i] = R.objects[R.objects.length - 1];
                R.objects.pop();
                return (true, "");
            }
        }
        return (false, "Item not found");
    }

    function drop(string calldata itm) external returns (bool, string memory) {
        if (!g[msg.sender].exists) return (false, "Game not started");
        Game storage G = g[msg.sender];
        Room storage R = G.rooms[G.curRoom];
        string[] storage B = G.bag;
        for (uint256 i; i < B.length; ++i) {
            if (_eq(B[i], itm)) {
                R.objects.push(itm);
                B[i] = B[B.length - 1];
                B.pop();
                return (true, "");
            }
        }
        return (false, "You don't have that item");
    }

    function go(string calldata dirName) external returns (bool, bool, string memory) {
        if (!g[msg.sender].exists) return (false, false, "Game not started");
        (bool ok, Direction d) = _parse(dirName);
        if (!ok) return (false, false, "Invalid direction");
        return _move(msg.sender, d);
    }

    function _move(address p, Direction d) internal returns (bool, bool, string memory) {
        Game storage G = g[p];
        uint256 from = G.curRoom;
        Room storage R = G.rooms[from];
        uint256 to = R.exits[d];
        if (to == NO_EXIT) return (false, false, "Can't go that way");
        string memory key = R.doorKey[d];
        if (bytes(key).length != 0 && !_hasKey(p, key)) return (false, false, string.concat("Need key ", key));
        G.curRoom = to;
        return (true, G.rooms[to].isExit, "");
    }

    function _hasKey(address p, string memory item) internal view returns (bool) {
        string[] storage B = g[p].bag;
        for (uint256 i; i < B.length; ++i) {
            if (_eq(B[i], item)) return true;
        }
        return false;
    }

    function _gen(address p) internal {
        Game storage G = g[p];
        G.regs.push(Subregion({x:0,y:0,w:G.roomCount*2,h:G.roomCount*2}));
        G.leaves.push(0);
        uint256 seed = uint256(keccak256(abi.encodePacked(block.timestamp, block.difficulty, p)));
        while (G.leaves.length < G.roomCount) {
            uint256 rid = G.leaves[seed % G.leaves.length];
            seed = uint256(keccak256(abi.encodePacked(seed)));
            _split(p, rid, seed);
            seed = uint256(keccak256(abi.encodePacked(seed)));
        }
        uint256[] memory reg2room = new uint256[](G.regs.length);
        for (uint256 i; i < G.leaves.length; ++i) {
            reg2room[G.leaves[i]] = i;
            _create(p, i);
        }
        for (uint256 i; i < G.edges.length; ++i) {
            uint256 a = reg2room[G.edges[i].r1];
            uint256 b = reg2room[G.edges[i].r2];
            if (G.edges[i].horiz) {
                _set(p, a, Direction.South, b);
                _set(p, b, Direction.North, a);
            } else {
                _set(p, a, Direction.East, b);
                _set(p, b, Direction.West, a);
            }
        }
        (uint256[] memory dist, uint256[] memory prev) = _bfs(p);
        uint256 exitId;
        for (uint256 i = 1; i < G.roomCount; ++i) {
            if (dist[i] > dist[exitId]) exitId = i;
        }
        G.rooms[exitId].isExit = true;
        uint256 pathLen = dist[exitId] + 1;
        uint256[] memory path = _back(exitId, prev, pathLen);
        uint256 puzzles = G.itemCount < pathLen ? G.itemCount : pathLen - 1;
        for (uint256 i = 1; i <= puzzles; ++i) {
            _puzzle(p, path[pathLen - i - 1], path[pathLen - i], i);
        }
    }

function _split(address p, uint256 rid, uint256 seed) private {
        Game storage G = g[p];
        // It's crucial to work with a memory copy for decision making about dimensions,
        // and then apply changes to the G.regs[rid] storage variable.
        Subregion storage R0_storage = G.regs[rid];
        Subregion memory R0_mem_copy = R0_storage; // Use this for reading initial dimensions

        bool can_split_horizontally = R0_mem_copy.h > 1;
        bool can_split_vertically = R0_mem_copy.w > 1;

        bool perform_actual_horizontal_split;
        bool split_is_possible = false;

        if (can_split_horizontally && can_split_vertically) {
            // Both directions are possible, choose based on proportions or randomness
            perform_actual_horizontal_split = R0_mem_copy.h > R0_mem_copy.w ? true : (R0_mem_copy.w > R0_mem_copy.h ? false : ((seed & 1) == 0));
            split_is_possible = true;
        } else if (can_split_horizontally) {
            perform_actual_horizontal_split = true;
            split_is_possible = true;
        } else if (can_split_vertically) {
            perform_actual_horizontal_split = false; // Must be vertical
            split_is_possible = true;
        }
        // If neither, split_is_possible remains false (e.g., region is 1x1)

        if (!split_is_possible) {
            // This region cannot be split further.
            // By returning here, G.leaves.push(new_idx) at the end of this function is skipped.
            // This means G.leaves.length in _gen() will not increment for this chosen 'rid'.
            // This could lead to the _gen() loop not reaching G.roomCount if all remaining
            // leaves become unsplittable. This is a design consideration for your BSP parameters.
            return;
        }

        uint256 new_idx = G.regs.length; // Pre-calculate index for the new region

        if (perform_actual_horizontal_split) {
            // Guaranteed R0_mem_copy.h > 1, so R0_mem_copy.h - 1 >= 1. Modulo is safe.
            uint256 sp_offset = seed % (R0_mem_copy.h - 1);
            uint256 sp = R0_mem_copy.y + 1 + sp_offset;

            R0_storage.h = sp - R0_mem_copy.y; // Modify the original region in storage
            G.regs.push(Subregion({
                x: R0_mem_copy.x,
                y: sp,
                w: R0_mem_copy.w,
                h: (R0_mem_copy.y + R0_mem_copy.h) - sp
            }));
            G.edges.push(Edge({r1: rid, r2: new_idx, horiz: true}));
        } else { // Perform vertical split
            // Guaranteed R0_mem_copy.w > 1, so R0_mem_copy.w - 1 >= 1. Modulo is safe.
            uint256 sp_offset = seed % (R0_mem_copy.w - 1);
            uint256 sp = R0_mem_copy.x + 1 + sp_offset;

            R0_storage.w = sp - R0_mem_copy.x; // Modify the original region in storage
            G.regs.push(Subregion({
                x: sp,
                y: R0_mem_copy.y,
                w: (R0_mem_copy.x + R0_mem_copy.w) - sp,
                h: R0_mem_copy.h
            }));
            G.edges.push(Edge({r1: rid, r2: new_idx, horiz: false}));
        }
        // This push increments G.leaves.length by 1 if a split occurred.
        // The loop in _gen() while (G.leaves.length < G.roomCount) relies on this.
        G.leaves.push(new_idx);
    }

    
    function _create(address p, uint256 id) internal {
        Room storage R = g[p].rooms[id];
        R.exists = true;
        for (uint256 d; d < 4; ++d) R.exits[Direction(d)] = NO_EXIT;
    }

    function _set(address p, uint256 from, Direction d, uint256 to) internal {
        g[p].rooms[from].exits[d] = to;
    }

    function _bfs(address p) private view returns (uint256[] memory, uint256[] memory) {
        Game storage G = g[p];
        uint256 n = G.roomCount;
        uint256[] memory dist = new uint256[](n);
        uint256[] memory prev = new uint256[](n);
        bool[] memory vis = new bool[](n);
        uint256[] memory q = new uint256[](n);
        vis[0] = true;
        q[0] = 0;
        uint256 h;
        uint256 t = 1;
        while (h < t) {
            uint256 u = q[h++];
            for (uint256 d; d < 4; ++d) {
                uint256 v = G.rooms[u].exits[Direction(d)];
                if (v != NO_EXIT && !vis[v]) {
                    vis[v] = true;
                    dist[v] = dist[u] + 1;
                    prev[v] = u;
                    q[t++] = v;
                }
            }
        }
        return (dist, prev);
    }

    function _back(uint256 end, uint256[] memory prev, uint256 len) private pure returns (uint256[] memory) {
        uint256[] memory path = new uint256[](len);
        uint256 idx = len - 1;
        for (uint256 cur = end; ; cur = prev[cur]) {
            path[idx] = cur;
            if (cur == 0) break;
            idx--;
        }
        return path;
    }

    function _puzzle(address p, uint256 parent, uint256 node, uint256 idx) private {
        Game storage G = g[p];
        Direction dir;
        for (uint256 d; d < 4; ++d) {
            if (G.rooms[parent].exits[Direction(d)] == node) {
                dir = Direction(d);
                break;
            }
        }
        string memory keyName = string.concat("Key", _uint2str(idx));
        G.rooms[parent].doorKey[dir] = keyName;
        uint256 tgt = _farthest(p);
        G.rooms[tgt].objects.push(keyName);
    }

    function _farthest(address p) private view returns (uint256) {
        Game storage G = g[p];
        uint256 n = G.roomCount;
        bool[] memory vis = new bool[](n);
        uint256[] memory q = new uint256[](n);
        uint256[] memory d = new uint256[](n);
        vis[0] = true;
        q[0] = 0;
        uint256 h;
        uint256 t = 1;
        while (h < t) {
            uint256 u = q[h++];
            for (uint256 dd; dd < 4; ++dd) {
                uint256 w = G.rooms[u].exits[Direction(dd)];
                if (w == NO_EXIT) continue;
                if (bytes(G.rooms[u].doorKey[Direction(dd)]).length != 0) continue;
                if (!vis[w]) {
                    vis[w] = true;
                    d[w] = d[u] + 1;
                    q[t++] = w;
                }
            }
        }
        uint256 far;
        for (uint256 i; i < n; ++i) {
            if (vis[i] && d[i] > d[far]) far = i;
        }
        return far;
    }

    function _toStr(Direction d) internal pure returns (string memory) {
        if (d == Direction.North) return "North";
        if (d == Direction.East) return "East";
        if (d == Direction.South) return "South";
        return "West";
    }

    function _parse(string calldata s) internal pure returns (bool, Direction) {
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

    function _uint2str(uint256 v) internal pure returns (string memory) {
        if (v == 0) return "0";
        uint256 j = v;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (v != 0) {
            bstr[--k] = bytes1(uint8(48 + v % 10));
            v /= 10;
        }
        return string(bstr);
    }
}
