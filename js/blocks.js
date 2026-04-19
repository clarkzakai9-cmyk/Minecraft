// js/blocks.js - Block registry with all block types and properties
(function() {
    'use strict';

    // Tool types
    const TOOL = { NONE: 0, PICKAXE: 1, AXE: 2, SHOVEL: 3, SWORD: 4, HOE: 5 };
    // Block categories
    const CAT = { SOLID: 0, TRANSPARENT: 1, LIQUID: 2, DECORATION: 3, FUNCTIONAL: 4 };

    // Block definitions: [name, hardness, toolType, category, transparent, lightLevel, stackSize, dropId]
    // dropId: null = drops self, 0 = drops nothing, number = drops that block id
    const blockDefs = [
        /* 0  */ { name: 'Air',           hardness: 0,   tool: TOOL.NONE,    cat: CAT.TRANSPARENT, transparent: true,  light: 0,  stackSize: 0 },
        /* 1  */ { name: 'Grass',         hardness: 0.6, tool: TOOL.SHOVEL,  cat: CAT.SOLID,       transparent: false, light: 0,  stackSize: 64, dropId: 2 },
        /* 2  */ { name: 'Dirt',          hardness: 0.5, tool: TOOL.SHOVEL,  cat: CAT.SOLID,       transparent: false, light: 0,  stackSize: 64 },
        /* 3  */ { name: 'Stone',         hardness: 1.5, tool: TOOL.PICKAXE, cat: CAT.SOLID,       transparent: false, light: 0,  stackSize: 64, dropId: 4 },
        /* 4  */ { name: 'Cobblestone',   hardness: 2.0, tool: TOOL.PICKAXE, cat: CAT.SOLID,       transparent: false, light: 0,  stackSize: 64 },
        /* 5  */ { name: 'Oak Log',       hardness: 2.0, tool: TOOL.AXE,     cat: CAT.SOLID,       transparent: false, light: 0,  stackSize: 64 },
        /* 6  */ { name: 'Oak Planks',    hardness: 2.0, tool: TOOL.AXE,     cat: CAT.SOLID,       transparent: false, light: 0,  stackSize: 64 },
        /* 7  */ { name: 'Oak Leaves',    hardness: 0.2, tool: TOOL.HOE,     cat: CAT.TRANSPARENT, transparent: true,  light: 0,  stackSize: 64 },
        /* 8  */ { name: 'Sand',          hardness: 0.5, tool: TOOL.SHOVEL,  cat: CAT.SOLID,       transparent: false, light: 0,  stackSize: 64 },
        /* 9  */ { name: 'Gravel',        hardness: 0.6, tool: TOOL.SHOVEL,  cat: CAT.SOLID,       transparent: false, light: 0,  stackSize: 64 },
        /* 10 */ { name: 'Water',         hardness: 100, tool: TOOL.NONE,    cat: CAT.LIQUID,      transparent: true,  light: 0,  stackSize: 0 },
        /* 11 */ { name: 'Lava',          hardness: 100, tool: TOOL.NONE,    cat: CAT.LIQUID,      transparent: true,  light: 15, stackSize: 0 },
        /* 12 */ { name: 'Coal Ore',      hardness: 3.0, tool: TOOL.PICKAXE, cat: CAT.SOLID,       transparent: false, light: 0,  stackSize: 64 },
        /* 13 */ { name: 'Iron Ore',      hardness: 3.0, tool: TOOL.PICKAXE, cat: CAT.SOLID,       transparent: false, light: 0,  stackSize: 64 },
        /* 14 */ { name: 'Gold Ore',      hardness: 3.0, tool: TOOL.PICKAXE, cat: CAT.SOLID,       transparent: false, light: 0,  stackSize: 64 },
        /* 15 */ { name: 'Diamond Ore',   hardness: 3.0, tool: TOOL.PICKAXE, cat: CAT.SOLID,       transparent: false, light: 0,  stackSize: 64 },
        /* 16 */ { name: 'Redstone Ore',  hardness: 3.0, tool: TOOL.PICKAXE, cat: CAT.SOLID,       transparent: false, light: 1,  stackSize: 64 },
        /* 17 */ { name: 'Emerald Ore',   hardness: 3.0, tool: TOOL.PICKAXE, cat: CAT.SOLID,       transparent: false, light: 0,  stackSize: 64 },
        /* 18 */ { name: 'Glass',         hardness: 0.3, tool: TOOL.NONE,    cat: CAT.TRANSPARENT, transparent: true,  light: 0,  stackSize: 64, dropId: 0 },
        /* 19 */ { name: 'Brick',         hardness: 2.0, tool: TOOL.PICKAXE, cat: CAT.SOLID,       transparent: false, light: 0,  stackSize: 64 },
        /* 20 */ { name: 'Clay',          hardness: 0.6, tool: TOOL.SHOVEL,  cat: CAT.SOLID,       transparent: false, light: 0,  stackSize: 64 },
        /* 21 */ { name: 'White Wool',    hardness: 0.8, tool: TOOL.NONE,    cat: CAT.SOLID,       transparent: false, light: 0,  stackSize: 64 },
        /* 22 */ { name: 'Red Wool',      hardness: 0.8, tool: TOOL.NONE,    cat: CAT.SOLID,       transparent: false, light: 0,  stackSize: 64 },
        /* 23 */ { name: 'Blue Wool',     hardness: 0.8, tool: TOOL.NONE,    cat: CAT.SOLID,       transparent: false, light: 0,  stackSize: 64 },
        /* 24 */ { name: 'Green Wool',    hardness: 0.8, tool: TOOL.NONE,    cat: CAT.SOLID,       transparent: false, light: 0,  stackSize: 64 },
        /* 25 */ { name: 'Yellow Wool',   hardness: 0.8, tool: TOOL.NONE,    cat: CAT.SOLID,       transparent: false, light: 0,  stackSize: 64 },
        /* 26 */ { name: 'Bedrock',       hardness: -1,  tool: TOOL.NONE,    cat: CAT.SOLID,       transparent: false, light: 0,  stackSize: 64 },
        /* 27 */ { name: 'Snow Block',    hardness: 0.2, tool: TOOL.SHOVEL,  cat: CAT.SOLID,       transparent: false, light: 0,  stackSize: 64 },
        /* 28 */ { name: 'Ice',           hardness: 0.5, tool: TOOL.PICKAXE, cat: CAT.TRANSPARENT, transparent: true,  light: 0,  stackSize: 64 },
        /* 29 */ { name: 'Crafting Table', hardness: 2.5, tool: TOOL.AXE,    cat: CAT.FUNCTIONAL,  transparent: false, light: 0,  stackSize: 64 },
        /* 30 */ { name: 'Furnace',       hardness: 3.5, tool: TOOL.PICKAXE, cat: CAT.FUNCTIONAL,  transparent: false, light: 0,  stackSize: 64 },
        /* 31 */ { name: 'Chest',         hardness: 2.5, tool: TOOL.AXE,     cat: CAT.FUNCTIONAL,  transparent: false, light: 0,  stackSize: 64 },
        /* 32 */ { name: 'Torch',         hardness: 0,   tool: TOOL.NONE,    cat: CAT.DECORATION,  transparent: true,  light: 14, stackSize: 64 },
        /* 33 */ { name: 'Birch Log',     hardness: 2.0, tool: TOOL.AXE,     cat: CAT.SOLID,       transparent: false, light: 0,  stackSize: 64 },
        /* 34 */ { name: 'Birch Planks',  hardness: 2.0, tool: TOOL.AXE,     cat: CAT.SOLID,       transparent: false, light: 0,  stackSize: 64 },
        /* 35 */ { name: 'Spruce Log',    hardness: 2.0, tool: TOOL.AXE,     cat: CAT.SOLID,       transparent: false, light: 0,  stackSize: 64 },
        /* 36 */ { name: 'Spruce Planks', hardness: 2.0, tool: TOOL.AXE,     cat: CAT.SOLID,       transparent: false, light: 0,  stackSize: 64 },
        /* 37 */ { name: 'Spruce Leaves', hardness: 0.2, tool: TOOL.HOE,     cat: CAT.TRANSPARENT, transparent: true,  light: 0,  stackSize: 64 },
        /* 38 */ { name: 'Cactus',        hardness: 0.4, tool: TOOL.NONE,    cat: CAT.SOLID,       transparent: false, light: 0,  stackSize: 64 },
        /* 39 */ { name: 'Rail',          hardness: 0.7, tool: TOOL.PICKAXE, cat: CAT.DECORATION,  transparent: true,  light: 0,  stackSize: 64 },
        /* 40 */ { name: 'Powered Rail',  hardness: 0.7, tool: TOOL.PICKAXE, cat: CAT.DECORATION,  transparent: true,  light: 0,  stackSize: 64 },
        /* 41 */ { name: 'Ladder',        hardness: 0.4, tool: TOOL.AXE,     cat: CAT.DECORATION,  transparent: true,  light: 0,  stackSize: 64 },
        /* 42 */ { name: 'Door',          hardness: 3.0, tool: TOOL.AXE,     cat: CAT.DECORATION,  transparent: true,  light: 0,  stackSize: 64 },
        /* 43 */ { name: 'Fence',         hardness: 2.0, tool: TOOL.AXE,     cat: CAT.DECORATION,  transparent: true,  light: 0,  stackSize: 64 },
        /* 44 */ { name: 'Slab',          hardness: 2.0, tool: TOOL.PICKAXE, cat: CAT.SOLID,       transparent: false, light: 0,  stackSize: 64 },
        /* 45 */ { name: 'Stairs',        hardness: 2.0, tool: TOOL.PICKAXE, cat: CAT.SOLID,       transparent: true,  light: 0,  stackSize: 64 },
        /* 46 */ { name: 'Lantern',       hardness: 3.5, tool: TOOL.PICKAXE, cat: CAT.DECORATION,  transparent: true,  light: 15, stackSize: 64 },
        /* 47 */ { name: 'Sign',          hardness: 1.0, tool: TOOL.AXE,     cat: CAT.DECORATION,  transparent: true,  light: 0,  stackSize: 16 },
        /* 48 */ { name: 'Netherrack',    hardness: 0.4, tool: TOOL.PICKAXE, cat: CAT.SOLID,       transparent: false, light: 0,  stackSize: 64 },
        /* 49 */ { name: 'Nether Brick',  hardness: 2.0, tool: TOOL.PICKAXE, cat: CAT.SOLID,       transparent: false, light: 0,  stackSize: 64 },
        /* 50 */ { name: 'Glowstone',     hardness: 0.3, tool: TOOL.NONE,    cat: CAT.SOLID,       transparent: false, light: 15, stackSize: 64 },
        /* 51 */ { name: 'Soul Sand',     hardness: 0.5, tool: TOOL.SHOVEL,  cat: CAT.SOLID,       transparent: false, light: 0,  stackSize: 64 },
        /* 52 */ { name: 'Obsidian',      hardness: 50,  tool: TOOL.PICKAXE, cat: CAT.SOLID,       transparent: false, light: 0,  stackSize: 64 },
        /* 53 */ { name: 'TNT',           hardness: 0,   tool: TOOL.NONE,    cat: CAT.SOLID,       transparent: false, light: 0,  stackSize: 64 },
        /* 54 */ { name: 'Bookshelf',     hardness: 1.5, tool: TOOL.AXE,     cat: CAT.SOLID,       transparent: false, light: 0,  stackSize: 64 },
        /* 55 */ { name: 'Mossy Cobble',  hardness: 2.0, tool: TOOL.PICKAXE, cat: CAT.SOLID,       transparent: false, light: 0,  stackSize: 64 },
        /* 56 */ { name: 'Tall Grass',    hardness: 0,   tool: TOOL.NONE,    cat: CAT.DECORATION,  transparent: true,  light: 0,  stackSize: 64 },
        /* 57 */ { name: 'Flower Red',    hardness: 0,   tool: TOOL.NONE,    cat: CAT.DECORATION,  transparent: true,  light: 0,  stackSize: 64 },
        /* 58 */ { name: 'Flower Yellow', hardness: 0,   tool: TOOL.NONE,    cat: CAT.DECORATION,  transparent: true,  light: 0,  stackSize: 64 },
        /* 59 */ { name: 'Sugar Cane',    hardness: 0,   tool: TOOL.NONE,    cat: CAT.DECORATION,  transparent: true,  light: 0,  stackSize: 64 },
        /* 60 */ { name: 'Detector Rail', hardness: 0.7, tool: TOOL.PICKAXE, cat: CAT.DECORATION,  transparent: true,  light: 0,  stackSize: 64 },
    ];

    // Tool item definitions
    const toolDefs = [
        /* 100 */ { name: 'Wooden Pickaxe',  tool: TOOL.PICKAXE, tier: 0, durability: 59,   speed: 2,  damage: 2 },
        /* 101 */ { name: 'Wooden Axe',       tool: TOOL.AXE,     tier: 0, durability: 59,   speed: 2,  damage: 3 },
        /* 102 */ { name: 'Wooden Shovel',    tool: TOOL.SHOVEL,  tier: 0, durability: 59,   speed: 2,  damage: 1 },
        /* 103 */ { name: 'Wooden Sword',     tool: TOOL.SWORD,   tier: 0, durability: 59,   speed: 1,  damage: 4 },
        /* 104 */ { name: 'Wooden Hoe',       tool: TOOL.HOE,     tier: 0, durability: 59,   speed: 2,  damage: 1 },
        /* 105 */ { name: 'Stone Pickaxe',    tool: TOOL.PICKAXE, tier: 1, durability: 131,  speed: 4,  damage: 3 },
        /* 106 */ { name: 'Stone Axe',        tool: TOOL.AXE,     tier: 1, durability: 131,  speed: 4,  damage: 4 },
        /* 107 */ { name: 'Stone Shovel',     tool: TOOL.SHOVEL,  tier: 1, durability: 131,  speed: 4,  damage: 2 },
        /* 108 */ { name: 'Stone Sword',      tool: TOOL.SWORD,   tier: 1, durability: 131,  speed: 1,  damage: 5 },
        /* 109 */ { name: 'Stone Hoe',        tool: TOOL.HOE,     tier: 1, durability: 131,  speed: 4,  damage: 1 },
        /* 110 */ { name: 'Iron Pickaxe',     tool: TOOL.PICKAXE, tier: 2, durability: 250,  speed: 6,  damage: 4 },
        /* 111 */ { name: 'Iron Axe',         tool: TOOL.AXE,     tier: 2, durability: 250,  speed: 6,  damage: 5 },
        /* 112 */ { name: 'Iron Shovel',      tool: TOOL.SHOVEL,  tier: 2, durability: 250,  speed: 6,  damage: 3 },
        /* 113 */ { name: 'Iron Sword',       tool: TOOL.SWORD,   tier: 2, durability: 250,  speed: 1,  damage: 6 },
        /* 114 */ { name: 'Iron Hoe',         tool: TOOL.HOE,     tier: 2, durability: 250,  speed: 6,  damage: 1 },
        /* 115 */ { name: 'Gold Pickaxe',     tool: TOOL.PICKAXE, tier: 3, durability: 32,   speed: 12, damage: 2 },
        /* 116 */ { name: 'Gold Axe',         tool: TOOL.AXE,     tier: 3, durability: 32,   speed: 12, damage: 3 },
        /* 117 */ { name: 'Gold Shovel',      tool: TOOL.SHOVEL,  tier: 3, durability: 32,   speed: 12, damage: 1 },
        /* 118 */ { name: 'Gold Sword',       tool: TOOL.SWORD,   tier: 3, durability: 32,   speed: 1,  damage: 4 },
        /* 119 */ { name: 'Gold Hoe',         tool: TOOL.HOE,     tier: 3, durability: 32,   speed: 12, damage: 1 },
        /* 120 */ { name: 'Diamond Pickaxe',  tool: TOOL.PICKAXE, tier: 4, durability: 1561, speed: 8,  damage: 5 },
        /* 121 */ { name: 'Diamond Axe',      tool: TOOL.AXE,     tier: 4, durability: 1561, speed: 8,  damage: 6 },
        /* 122 */ { name: 'Diamond Shovel',   tool: TOOL.SHOVEL,  tier: 4, durability: 1561, speed: 8,  damage: 4 },
        /* 123 */ { name: 'Diamond Sword',    tool: TOOL.SWORD,   tier: 4, durability: 1561, speed: 1,  damage: 7 },
        /* 124 */ { name: 'Diamond Hoe',      tool: TOOL.HOE,     tier: 4, durability: 1561, speed: 8,  damage: 1 },
    ];

    // Material item definitions (non-block, non-tool items)
    const materialDefs = [
        /* 200 */ { name: 'Stick',            stackSize: 64 },
        /* 201 */ { name: 'Coal',             stackSize: 64 },
        /* 202 */ { name: 'Iron Ingot',       stackSize: 64 },
        /* 203 */ { name: 'Gold Ingot',       stackSize: 64 },
        /* 204 */ { name: 'Diamond',          stackSize: 64 },
        /* 205 */ { name: 'Redstone Dust',    stackSize: 64 },
        /* 206 */ { name: 'Emerald',          stackSize: 64 },
        /* 207 */ { name: 'Leather',          stackSize: 64 },
        /* 208 */ { name: 'Raw Pork',         stackSize: 64 },
        /* 209 */ { name: 'Cooked Pork',      stackSize: 64 },
        /* 210 */ { name: 'Raw Beef',         stackSize: 64 },
        /* 211 */ { name: 'Cooked Beef',      stackSize: 64 },
        /* 212 */ { name: 'Raw Chicken',      stackSize: 64 },
        /* 213 */ { name: 'Cooked Chicken',   stackSize: 64 },
        /* 214 */ { name: 'Feather',          stackSize: 64 },
        /* 215 */ { name: 'String',           stackSize: 64 },
        /* 216 */ { name: 'Bone',             stackSize: 64 },
        /* 217 */ { name: 'Gunpowder',        stackSize: 64 },
        /* 218 */ { name: 'Slimeball',        stackSize: 64 },
        /* 219 */ { name: 'Arrow',            stackSize: 64 },
        /* 220 */ { name: 'Wool',             stackSize: 64 },
        /* 221 */ { name: 'Minecart',         stackSize: 1  },
        /* 222 */ { name: 'Bread',            stackSize: 64 },
        /* 223 */ { name: 'Apple',            stackSize: 64 },
    ];

    // Block Manager class
    class BlockManager {
        constructor() {
            this.blocks = {};
            this.tools = {};
            this.materials = {};
            this.items = {}; // Unified item lookup

            // Register blocks
            blockDefs.forEach((def, id) => {
                this.blocks[id] = { id, ...def };
                this.items[id] = { id, type: 'block', ...def };
            });

            // Register tools
            toolDefs.forEach((def, i) => {
                const id = 100 + i;
                this.tools[id] = { id, ...def, stackSize: 1, type: 'tool' };
                this.items[id] = { id, type: 'tool', ...def, stackSize: 1 };
            });

            // Register materials
            materialDefs.forEach((def, i) => {
                const id = 200 + i;
                this.materials[id] = { id, ...def, type: 'material' };
                this.items[id] = { id, type: 'material', ...def };
            });
        }

        getBlock(id) { return this.blocks[id]; }
        getTool(id) { return this.tools[id]; }
        getMaterial(id) { return this.materials[id]; }
        getItem(id) { return this.items[id]; }
        isBlock(id) { return id >= 0 && id < 100; }
        isTool(id) { return id >= 100 && id < 200; }
        isMaterial(id) { return id >= 200 && id < 300; }
        isSolid(id) { const b = this.blocks[id]; return b && !b.transparent && b.cat !== CAT.LIQUID; }
        isTransparent(id) { const b = this.blocks[id]; return !b || b.transparent; }
        isLiquid(id) { const b = this.blocks[id]; return b && b.cat === CAT.LIQUID; }
        isDecoration(id) { const b = this.blocks[id]; return b && b.cat === CAT.DECORATION; }

        getDropId(blockId) {
            const b = this.blocks[blockId];
            if (!b) return 0;
            if (b.dropId === undefined || b.dropId === null) return blockId;
            return b.dropId;
        }

        getBreakTime(blockId, toolId) {
            const b = this.blocks[blockId];
            if (!b || b.hardness < 0) return Infinity; // Unbreakable
            if (b.hardness === 0) return 0.05;
            let speed = 1;
            if (toolId && this.tools[toolId]) {
                const t = this.tools[toolId];
                if (t.tool === b.tool) speed = t.speed;
            }
            return b.hardness / speed;
        }

        getItemName(id) {
            const item = this.items[id];
            return item ? item.name : 'Unknown';
        }

        getStackSize(id) {
            const item = this.items[id];
            return item ? (item.stackSize || 64) : 64;
        }
    }

    window.TOOL = TOOL;
    window.CAT = CAT;
    window.BlockManager = BlockManager;
})();
