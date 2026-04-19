// js/textures.js - Procedural 16x16 texture generation and atlas building
(function() {
'use strict';
const S = 16; // texture size

function makeCtx() {
    const c = document.createElement('canvas');
    c.width = S; c.height = S;
    return c.getContext('2d');
}

function fill(ctx, color) { ctx.fillStyle = color; ctx.fillRect(0,0,S,S); }

function noise(ctx, baseColor, variance, density) {
    const [r,g,b] = baseColor;
    const d = ctx.getImageData(0,0,S,S);
    for (let i = 0; i < d.data.length; i+=4) {
        if (Math.random() < (density||0.4)) {
            const v = (Math.random()-0.5)*variance;
            d.data[i] = Math.max(0,Math.min(255,r+v));
            d.data[i+1] = Math.max(0,Math.min(255,g+v));
            d.data[i+2] = Math.max(0,Math.min(255,b+v));
        } else {
            d.data[i]=r; d.data[i+1]=g; d.data[i+2]=b;
        }
        d.data[i+3]=255;
    }
    ctx.putImageData(d,0,0);
}

function dots(ctx, color, count) {
    ctx.fillStyle = color;
    for (let i=0;i<count;i++) {
        const x=Math.floor(Math.random()*S), y=Math.floor(Math.random()*S);
        ctx.fillRect(x,y,1,1);
    }
}

function rect(ctx, x, y, w, h, color) { ctx.fillStyle=color; ctx.fillRect(x,y,w,h); }

function ore(ctx, baseColor, oreColor, count) {
    noise(ctx, baseColor, 30, 0.5);
    for (let i=0;i<count;i++) {
        const cx=2+Math.floor(Math.random()*12), cy=2+Math.floor(Math.random()*12);
        for (let dx=-1;dx<=1;dx++) for (let dy=-1;dy<=1;dy++) {
            if (Math.random()>0.4) { ctx.fillStyle=oreColor; ctx.fillRect(cx+dx,cy+dy,1,1); }
        }
    }
}

// Texture generators for each block face
// Returns {top, side, bottom} canvas contexts (or single if all same)
const generators = {
    1: { // Grass
        top: () => { const c=makeCtx(); noise(c,[86,160,40],40,0.6); dots(c,'#4a8020',20); return c.canvas; },
        side: () => { const c=makeCtx(); noise(c,[134,96,67],25,0.5); rect(c,0,0,S,3,'#5a9830'); dots(c,'#4a8020',8); return c.canvas; },
        bottom: () => { const c=makeCtx(); noise(c,[134,96,67],25,0.5); return c.canvas; }
    },
    2: () => { const c=makeCtx(); noise(c,[134,96,67],25,0.5); return c.canvas; }, // Dirt
    3: () => { const c=makeCtx(); noise(c,[128,128,128],30,0.5); return c.canvas; }, // Stone
    4: () => { const c=makeCtx(); noise(c,[120,120,120],20,0.4); // Cobblestone
        for(let i=0;i<6;i++){const x=Math.floor(Math.random()*14),y=Math.floor(Math.random()*14);
        rect(c,x,y,3,3,'#707070');rect(c,x,y,3,1,'#888');} return c.canvas; },
    5: { // Oak Log
        top: () => { const c=makeCtx(); fill(c,'#b5945a'); for(let r=2;r<8;r+=2){c.strokeStyle='#8a6e3a';c.beginPath();c.arc(8,8,r,0,Math.PI*2);c.stroke();} return c.canvas; },
        side: () => { const c=makeCtx(); noise(c,[101,76,48],20,0.3); for(let x=0;x<S;x+=3){rect(c,x,0,1,S,'#55422a');} return c.canvas; }
    },
    6: () => { const c=makeCtx(); fill(c,'#bc9862'); for(let y=0;y<S;y+=4) rect(c,0,y,S,1,'#a07840'); for(let x=0;x<S;x+=4) rect(c,x,0,1,S,'#a07840'); return c.canvas; }, // Oak Planks
    7: () => { const c=makeCtx(); noise(c,[56,118,29],50,0.7); dots(c,'#2d6610',30); return c.canvas; }, // Oak Leaves
    8: () => { const c=makeCtx(); noise(c,[219,211,160],20,0.6); dots(c,'#c8b870',15); return c.canvas; }, // Sand
    9: () => { const c=makeCtx(); noise(c,[136,126,126],30,0.6); dots(c,'#6a6060',20); return c.canvas; }, // Gravel
    10: () => { const c=makeCtx(); fill(c,'rgba(32,80,200,0.7)'); dots(c,'rgba(64,120,255,0.5)',20); return c.canvas; }, // Water
    11: () => { const c=makeCtx(); noise(c,[207,90,18],40,0.6); dots(c,'#ff6600',15); dots(c,'#ffaa00',10); return c.canvas; }, // Lava
    12: () => { const c=makeCtx(); ore(c,[128,128,128],'#333',3); return c.canvas; }, // Coal Ore
    13: () => { const c=makeCtx(); ore(c,[128,128,128],'#d4a574',3); return c.canvas; }, // Iron Ore
    14: () => { const c=makeCtx(); ore(c,[128,128,128],'#fcee4b',2); return c.canvas; }, // Gold Ore
    15: () => { const c=makeCtx(); ore(c,[128,128,128],'#5decf5',2); return c.canvas; }, // Diamond Ore
    16: () => { const c=makeCtx(); ore(c,[128,128,128],'#ff0000',3); return c.canvas; }, // Redstone Ore
    17: () => { const c=makeCtx(); ore(c,[128,128,128],'#17dd62',2); return c.canvas; }, // Emerald Ore
    18: () => { const c=makeCtx(); fill(c,'rgba(200,220,255,0.3)'); rect(c,0,0,S,1,'rgba(255,255,255,0.4)'); rect(c,0,0,1,S,'rgba(255,255,255,0.4)'); return c.canvas; }, // Glass
    19: () => { const c=makeCtx(); fill(c,'#9b4a33'); // Brick
        for(let y=0;y<S;y+=4){rect(c,0,y,S,1,'#6b3020'); const off=y%8===0?0:4;
        for(let x=off;x<S;x+=8) rect(c,x,y,1,4,'#6b3020');} return c.canvas; },
    20: () => { const c=makeCtx(); noise(c,[160,166,180],15,0.4); return c.canvas; }, // Clay
    21: () => { const c=makeCtx(); noise(c,[240,240,240],10,0.3); return c.canvas; }, // White Wool
    22: () => { const c=makeCtx(); noise(c,[180,40,40],20,0.3); return c.canvas; }, // Red Wool
    23: () => { const c=makeCtx(); noise(c,[40,50,180],20,0.3); return c.canvas; }, // Blue Wool
    24: () => { const c=makeCtx(); noise(c,[40,140,40],20,0.3); return c.canvas; }, // Green Wool
    25: () => { const c=makeCtx(); noise(c,[210,200,50],20,0.3); return c.canvas; }, // Yellow Wool
    26: () => { const c=makeCtx(); fill(c,'#333'); dots(c,'#555',30); dots(c,'#222',20); return c.canvas; }, // Bedrock
    27: () => { const c=makeCtx(); noise(c,[240,250,255],8,0.3); dots(c,'#e0f0ff',10); return c.canvas; }, // Snow Block
    28: () => { const c=makeCtx(); fill(c,'rgba(160,200,255,0.6)'); dots(c,'rgba(200,230,255,0.4)',15); return c.canvas; }, // Ice
    29: { // Crafting Table
        top: () => { const c=makeCtx(); fill(c,'#bc9862'); rect(c,0,0,8,8,'#9a7842'); rect(c,8,8,8,8,'#9a7842'); for(let i=0;i<S;i+=2) rect(c,i,0,1,S,'#a08050'); return c.canvas; },
        side: () => { const c=makeCtx(); fill(c,'#bc9862'); rect(c,2,2,5,5,'#8a6030'); rect(c,9,2,5,5,'#8a6030'); rect(c,2,9,12,5,'#7a5020'); return c.canvas; }
    },
    30: { // Furnace
        top: () => { const c=makeCtx(); noise(c,[128,128,128],20,0.4); return c.canvas; },
        side: () => { const c=makeCtx(); noise(c,[128,128,128],20,0.4); rect(c,4,4,8,8,'#333'); rect(c,5,5,6,6,'#555'); rect(c,6,8,4,3,'#883311'); return c.canvas; }
    },
    31: { // Chest
        top: () => { const c=makeCtx(); fill(c,'#8a5a2a'); rect(c,1,1,14,14,'#a06a30'); return c.canvas; },
        side: () => { const c=makeCtx(); fill(c,'#8a5a2a'); rect(c,1,1,14,14,'#a06a30'); rect(c,6,6,4,4,'#c8a850'); rect(c,7,7,2,2,'#4a3a1a'); return c.canvas; }
    },
    32: () => { const c=makeCtx(); fill(c,'rgba(0,0,0,0)'); rect(c,6,0,4,12,'#8a6a3a'); rect(c,5,0,6,3,'#ffa500'); rect(c,6,1,4,2,'#ffdd44'); return c.canvas; }, // Torch
    33: { // Birch Log
        top: () => { const c=makeCtx(); fill(c,'#d4c6a0'); for(let r=2;r<8;r+=2){c.strokeStyle='#a09070';c.beginPath();c.arc(8,8,r,0,Math.PI*2);c.stroke();} return c.canvas; },
        side: () => { const c=makeCtx(); noise(c,[220,215,200],15,0.3); for(let y=0;y<S;y+=5) rect(c,0,y,S,1,'#333'); return c.canvas; }
    },
    34: () => { const c=makeCtx(); fill(c,'#d4c6a0'); for(let y=0;y<S;y+=4) rect(c,0,y,S,1,'#b0a480'); for(let x=0;x<S;x+=4) rect(c,x,0,1,S,'#b0a480'); return c.canvas; }, // Birch Planks
    35: { // Spruce Log
        top: () => { const c=makeCtx(); fill(c,'#6a4a30'); for(let r=2;r<8;r+=2){c.strokeStyle='#4a3020';c.beginPath();c.arc(8,8,r,0,Math.PI*2);c.stroke();} return c.canvas; },
        side: () => { const c=makeCtx(); noise(c,[75,55,35],15,0.3); for(let x=0;x<S;x+=3) rect(c,x,0,1,S,'#3a2a1a'); return c.canvas; }
    },
    36: () => { const c=makeCtx(); fill(c,'#7a5a3a'); for(let y=0;y<S;y+=4) rect(c,0,y,S,1,'#604028'); for(let x=0;x<S;x+=4) rect(c,x,0,1,S,'#604028'); return c.canvas; }, // Spruce Planks
    37: () => { const c=makeCtx(); noise(c,[30,80,30],40,0.7); dots(c,'#1a4a10',30); return c.canvas; }, // Spruce Leaves
    38: { // Cactus
        top: () => { const c=makeCtx(); fill(c,'#2a7a2a'); dots(c,'#1a5a1a',20); rect(c,6,6,4,4,'#3a9a3a'); return c.canvas; },
        side: () => { const c=makeCtx(); noise(c,[42,120,42],25,0.4); for(let y=0;y<S;y+=4){dots(c,'#5a3a00',2);} for(let x=2;x<S;x+=4) rect(c,x,0,1,S,'#2a8a2a'); return c.canvas; }
    },
    39: () => { const c=makeCtx(); fill(c,'rgba(0,0,0,0)'); rect(c,0,6,S,4,'#8a6a3a'); rect(c,2,7,S-4,2,'#6a5030'); return c.canvas; }, // Rail
    40: () => { const c=makeCtx(); fill(c,'rgba(0,0,0,0)'); rect(c,0,6,S,4,'#aa8a2a'); rect(c,2,7,S-4,2,'#cc4444'); return c.canvas; }, // Powered Rail
    41: () => { const c=makeCtx(); fill(c,'rgba(0,0,0,0)'); for(let y=0;y<S;y+=3) rect(c,2,y,12,1,'#8a6a3a'); rect(c,2,0,1,S,'#7a5a2a'); rect(c,13,0,1,S,'#7a5a2a'); return c.canvas; }, // Ladder
    42: () => { const c=makeCtx(); fill(c,'#8a6a3a'); rect(c,2,0,12,S,'#a07a4a'); rect(c,3,1,4,6,'#6a4a2a'); rect(c,9,1,4,6,'#6a4a2a'); rect(c,3,9,4,6,'#6a4a2a'); rect(c,9,9,4,6,'#6a4a2a'); return c.canvas; }, // Door
    43: () => { const c=makeCtx(); fill(c,'rgba(0,0,0,0)'); rect(c,2,0,3,S,'#8a6a3a'); rect(c,11,0,3,S,'#8a6a3a'); rect(c,2,2,12,2,'#7a5a2a'); rect(c,2,12,12,2,'#7a5a2a'); return c.canvas; }, // Fence
    44: () => { const c=makeCtx(); noise(c,[180,180,180],15,0.4); rect(c,0,0,S,1,'#aaa'); return c.canvas; }, // Slab
    45: () => { const c=makeCtx(); noise(c,[180,180,180],15,0.4); for(let i=0;i<S;i++) rect(c,0,i,i+1,1,'#999'); return c.canvas; }, // Stairs
    46: () => { const c=makeCtx(); fill(c,'rgba(0,0,0,0)'); rect(c,4,2,8,12,'#4a4a4a'); rect(c,5,3,6,10,'#ffcc44'); dots(c,'#ffee88',8); return c.canvas; }, // Lantern
    47: () => { const c=makeCtx(); fill(c,'#bc9862'); rect(c,1,1,14,14,'#a08050'); rect(c,3,3,10,10,'#c8a870'); return c.canvas; }, // Sign
    48: () => { const c=makeCtx(); noise(c,[100,30,30],30,0.6); return c.canvas; }, // Netherrack
    49: () => { const c=makeCtx(); fill(c,'#3a1a1a'); for(let y=0;y<S;y+=4) rect(c,0,y,S,1,'#2a0a0a'); for(let x=0;x<S;x+=4) rect(c,x,0,1,S,'#2a0a0a'); return c.canvas; }, // Nether Brick
    50: () => { const c=makeCtx(); noise(c,[200,180,100],30,0.5); dots(c,'#ffee88',25); return c.canvas; }, // Glowstone
    51: () => { const c=makeCtx(); noise(c,[85,64,50],20,0.5); return c.canvas; }, // Soul Sand
    52: () => { const c=makeCtx(); fill(c,'#1a0a2a'); dots(c,'#2a1a3a',30); return c.canvas; }, // Obsidian
    53: () => { const c=makeCtx(); fill(c,'#cc2200'); rect(c,0,0,S,5,'#f5f5dc'); rect(c,4,5,8,6,'#333'); rect(c,0,11,S,5,'#f5f5dc'); return c.canvas; }, // TNT
    54: () => { const c=makeCtx(); fill(c,'#bc9862'); for(let y=0;y<S;y+=5) for(let x=0;x<S;x+=5) { rect(c,x+1,y+1,4,4,'#6a5030'); rect(c,x+1,y+1,4,1,'#8a7050'); } return c.canvas; }, // Bookshelf
    55: () => { const c=makeCtx(); noise(c,[100,120,100],20,0.4); dots(c,'#4a8a4a',15); // Mossy Cobble
        for(let i=0;i<4;i++){const x=Math.floor(Math.random()*14),y=Math.floor(Math.random()*14);rect(c,x,y,3,3,'#5a6a5a');} return c.canvas; },
    56: () => { const c=makeCtx(); fill(c,'rgba(0,0,0,0)'); // Tall Grass
        for(let i=0;i<8;i++){const x=Math.floor(Math.random()*14)+1; c.fillStyle='#4a8a2a'; c.fillRect(x,2,1,12);c.fillRect(x-1,4+Math.floor(Math.random()*4),3,1);} return c.canvas; },
    57: () => { const c=makeCtx(); fill(c,'rgba(0,0,0,0)'); rect(c,6,6,4,8,'#3a7a2a'); rect(c,5,2,6,5,'#dd3333'); dots(c,'#ff6666',3); return c.canvas; }, // Red Flower
    58: () => { const c=makeCtx(); fill(c,'rgba(0,0,0,0)'); rect(c,6,6,4,8,'#3a7a2a'); rect(c,5,2,6,5,'#dddd33'); dots(c,'#ffff66',3); return c.canvas; }, // Yellow Flower
    59: () => { const c=makeCtx(); fill(c,'rgba(0,0,0,0)'); rect(c,5,0,2,S,'#5aaa3a'); rect(c,9,0,2,S,'#5aaa3a'); rect(c,7,0,2,S,'#4a9a2a'); return c.canvas; }, // Sugar Cane
    60: () => { const c=makeCtx(); fill(c,'rgba(0,0,0,0)'); rect(c,0,6,S,4,'#8a6a3a'); rect(c,2,7,S-4,2,'#aa4444'); rect(c,6,5,4,2,'#cc6666'); return c.canvas; }, // Detector Rail
};

// Tool/item icon generators
const itemGenerators = {
    100: (tier) => { const c=makeCtx(); fill(c,'rgba(0,0,0,0)'); const colors=['#8a6a3a','#aaa','#ddd','#ffd700','#5decf5'];
        const col=colors[tier]||colors[0]; rect(c,7,0,2,10,col); rect(c,5,0,6,2,col); rect(c,6,10,4,2,'#6a4a2a'); return c.canvas; },
    200: () => { const c=makeCtx(); fill(c,'rgba(0,0,0,0)'); rect(c,7,1,2,14,'#8a6a3a'); return c.canvas; }, // Stick
};

class TextureManager {
    constructor() {
        this.atlas = null;
        this.atlasSize = 0;
        this.texPerRow = 0;
        this.faceMap = {}; // blockId -> {top, side, bottom} atlas indices
        this.itemIcons = {}; // itemId -> canvas
        this.threeTex = null;
    }

    async buildAtlas() {
        const atlas = document.createElement('canvas');
        atlas.width = 256;
        atlas.height = 256;
        this.ctx = atlas.getContext('2d', {willReadFrequently: true});
        this.ctx.fillStyle = '#ff00ff'; // Magenta background for missing textures
        this.ctx.fillRect(0,0,256,256);

        this.texList = [
            'grass_block_top', 'grass_block_side', 'dirt', 'stone',
            'cobblestone', 'oak_log_top', 'oak_log', 'oak_planks',
            'oak_leaves', 'sand', 'gravel', 'water_still',
            'lava_still', 'coal_ore', 'iron_ore', 'gold_ore',
            'diamond_ore', 'redstone_ore', 'emerald_ore', 'glass',
            'bricks', 'clay', 'white_wool', 'red_wool',
            'blue_wool', 'green_wool', 'yellow_wool', 'bedrock',
            'snow', 'ice', 'crafting_table_top', 'crafting_table_side',
            'furnace_top', 'furnace_side', 'barrel_top', 'barrel_side',
            'barrel_bottom', 'torch', 'birch_log_top', 'birch_log',
            'birch_planks', 'spruce_log_top', 'spruce_log', 'spruce_planks',
            'spruce_leaves', 'cactus_top', 'cactus_side', 'cactus_bottom',
            'rail', 'powered_rail', 'ladder', 'oak_door_top',
            'smooth_stone', 'lantern', 'netherrack', 'nether_bricks',
            'glowstone', 'soul_sand', 'obsidian', 'tnt_top',
            'tnt_side', 'tnt_bottom', 'bookshelf', 'mossy_cobblestone',
            'tall_grass_bottom', 'poppy', 'dandelion', 'sugar_cane',
            'detector_rail'
        ];

        this.texPerRow = 16;
        this.atlasSize = 256;
        this.tileSize = this.atlasSize / this.texPerRow; // 16px
        
        this.loadedTextures = new Set();
        this.atlas = atlas;

        const t = (name) => Math.max(0, this.texList.indexOf(name));
        
        const map = {
            1: { top: t('grass_block_top'), side: t('grass_block_side'), bottom: t('dirt') },
            2: { top: t('dirt'), side: t('dirt'), bottom: t('dirt') },
            3: { top: t('stone'), side: t('stone'), bottom: t('stone') },
            4: { top: t('cobblestone'), side: t('cobblestone'), bottom: t('cobblestone') },
            5: { top: t('oak_log_top'), side: t('oak_log'), bottom: t('oak_log_top') },
            6: { top: t('oak_planks'), side: t('oak_planks'), bottom: t('oak_planks') },
            7: { top: t('oak_leaves'), side: t('oak_leaves'), bottom: t('oak_leaves') },
            8: { top: t('sand'), side: t('sand'), bottom: t('sand') },
            9: { top: t('gravel'), side: t('gravel'), bottom: t('gravel') },
            10: { top: t('water_still'), side: t('water_still'), bottom: t('water_still') },
            11: { top: t('lava_still'), side: t('lava_still'), bottom: t('lava_still') },
            12: { top: t('coal_ore'), side: t('coal_ore'), bottom: t('coal_ore') },
            13: { top: t('iron_ore'), side: t('iron_ore'), bottom: t('iron_ore') },
            14: { top: t('gold_ore'), side: t('gold_ore'), bottom: t('gold_ore') },
            15: { top: t('diamond_ore'), side: t('diamond_ore'), bottom: t('diamond_ore') },
            16: { top: t('redstone_ore'), side: t('redstone_ore'), bottom: t('redstone_ore') },
            17: { top: t('emerald_ore'), side: t('emerald_ore'), bottom: t('emerald_ore') },
            18: { top: t('glass'), side: t('glass'), bottom: t('glass') },
            19: { top: t('bricks'), side: t('bricks'), bottom: t('bricks') },
            20: { top: t('clay'), side: t('clay'), bottom: t('clay') },
            21: { top: t('white_wool'), side: t('white_wool'), bottom: t('white_wool') },
            22: { top: t('red_wool'), side: t('red_wool'), bottom: t('red_wool') },
            23: { top: t('blue_wool'), side: t('blue_wool'), bottom: t('blue_wool') },
            24: { top: t('green_wool'), side: t('green_wool'), bottom: t('green_wool') },
            25: { top: t('yellow_wool'), side: t('yellow_wool'), bottom: t('yellow_wool') },
            26: { top: t('bedrock'), side: t('bedrock'), bottom: t('bedrock') },
            27: { top: t('snow'), side: t('snow'), bottom: t('snow') },
            28: { top: t('ice'), side: t('ice'), bottom: t('ice') },
            29: { top: t('crafting_table_top'), side: t('crafting_table_side'), bottom: t('oak_planks') },
            30: { top: t('furnace_top'), side: t('furnace_side'), bottom: t('furnace_top') },
            31: { top: t('barrel_top'), side: t('barrel_side'), bottom: t('barrel_bottom') },
            32: { top: t('torch'), side: t('torch'), bottom: t('torch') },
            33: { top: t('birch_log_top'), side: t('birch_log'), bottom: t('birch_log_top') },
            34: { top: t('birch_planks'), side: t('birch_planks'), bottom: t('birch_planks') },
            35: { top: t('spruce_log_top'), side: t('spruce_log'), bottom: t('spruce_log_top') },
            36: { top: t('spruce_planks'), side: t('spruce_planks'), bottom: t('spruce_planks') },
            37: { top: t('spruce_leaves'), side: t('spruce_leaves'), bottom: t('spruce_leaves') },
            38: { top: t('cactus_top'), side: t('cactus_side'), bottom: t('cactus_bottom') },
            39: { top: t('rail'), side: t('rail'), bottom: t('rail') },
            40: { top: t('powered_rail'), side: t('powered_rail'), bottom: t('powered_rail') },
            41: { top: t('ladder'), side: t('ladder'), bottom: t('ladder') },
            42: { top: t('oak_door_top'), side: t('oak_door_top'), bottom: t('oak_door_top') },
            43: { top: t('oak_planks'), side: t('oak_planks'), bottom: t('oak_planks') },
            44: { top: t('smooth_stone'), side: t('smooth_stone'), bottom: t('smooth_stone') },
            45: { top: t('cobblestone'), side: t('cobblestone'), bottom: t('cobblestone') },
            46: { top: t('lantern'), side: t('lantern'), bottom: t('lantern') },
            47: { top: t('oak_planks'), side: t('oak_planks'), bottom: t('oak_planks') },
            48: { top: t('netherrack'), side: t('netherrack'), bottom: t('netherrack') },
            49: { top: t('nether_bricks'), side: t('nether_bricks'), bottom: t('nether_bricks') },
            50: { top: t('glowstone'), side: t('glowstone'), bottom: t('glowstone') },
            51: { top: t('soul_sand'), side: t('soul_sand'), bottom: t('soul_sand') },
            52: { top: t('obsidian'), side: t('obsidian'), bottom: t('obsidian') },
            53: { top: t('tnt_top'), side: t('tnt_side'), bottom: t('tnt_bottom') },
            54: { top: t('oak_planks'), side: t('bookshelf'), bottom: t('oak_planks') },
            55: { top: t('mossy_cobblestone'), side: t('mossy_cobblestone'), bottom: t('mossy_cobblestone') },
            56: { top: t('tall_grass_bottom'), side: t('tall_grass_bottom'), bottom: t('tall_grass_bottom') },
            57: { top: t('poppy'), side: t('poppy'), bottom: t('poppy') },
            58: { top: t('dandelion'), side: t('dandelion'), bottom: t('dandelion') },
            59: { top: t('sugar_cane'), side: t('sugar_cane'), bottom: t('sugar_cane') },
            60: { top: t('detector_rail'), side: t('detector_rail'), bottom: t('detector_rail') }
        };
        
        this.faceMap = {};
        for (let i = 0; i < 100; i++) {
            if (map[i]) this.faceMap[i] = map[i];
            else this.faceMap[i] = { top: t('stone'), side: t('stone'), bottom: t('stone') }; 
        }

        this.buildToolIcons();
        
        // Pre-allocate canvases for all blocks so UI can attach them immediately
        for (const id in this.faceMap) {
            const c = document.createElement('canvas');
            c.width = this.tileSize; c.height = this.tileSize;
            this.itemIcons[id] = c;
        }
        
        // Pre-load essential textures for UI and early rendering
        this.loadTexture('grass_block_top');
        this.loadTexture('grass_block_side');
        this.loadTexture('dirt');
        this.loadTexture('stone');

        return atlas;
    }

    loadTexture(name) {
        if (this.loadedTextures.has(name)) return;
        this.loadedTextures.add(name);
        const i = this.texList.indexOf(name);
        if (i === -1) return;

        const img = new Image();
        img.onload = () => {
            const x = (i % this.texPerRow) * this.tileSize;
            const y = Math.floor(i / this.texPerRow) * this.tileSize;
            try {
                // Draw full image scaled to tileSize
                this.ctx.drawImage(img, x, y, this.tileSize, this.tileSize);
                if (this.threeTex) this.threeTex.needsUpdate = true;
                this.buildSingleItemIcon(i);
            } catch (e) {
                console.warn("Could not generate item icon (likely CORS/file:// protocol issue). Texture should still appear in-game.");
            }
        };
        img.src = `Assets/${name}.png`;
    }

    buildSingleItemIcon(texIndex) {
        for (const [idStr, fm] of Object.entries(this.faceMap)) {
            if (fm.side === texIndex || fm.top === texIndex) {
                const id = parseInt(idStr);
                const uv = this.getUV(id, 'side');
                const x = uv.u * this.atlasSize;
                const y = uv.v * this.atlasSize;
                const d = this.ctx.getImageData(x, y, this.tileSize, this.tileSize);
                
                let c = this.itemIcons[id];
                if (!c) {
                    c = document.createElement('canvas');
                    c.width = this.tileSize; c.height = this.tileSize;
                    this.itemIcons[id] = c;
                }
                c.getContext('2d').putImageData(d, 0, 0);
            }
        }
    }

    buildToolIcons() {

        // Tool icons
        const tierColors = ['#8a6a3a','#aaa','#ddd','#ffd700','#5decf5'];
        for (let tier = 0; tier < 5; tier++) {
            const base = 100 + tier * 5;
            const col = tierColors[tier];
            // Pickaxe
            let c = makeCtx(); fill(c,'rgba(0,0,0,0)');
            rect(c,3,1,10,2,col); rect(c,7,3,2,11,'#6a4a2a');
            this.itemIcons[base] = c.canvas;
            // Axe
            c = makeCtx(); fill(c,'rgba(0,0,0,0)');
            rect(c,3,1,6,5,col); rect(c,7,3,2,11,'#6a4a2a');
            this.itemIcons[base+1] = c.canvas;
            // Shovel
            c = makeCtx(); fill(c,'rgba(0,0,0,0)');
            rect(c,6,1,4,4,col); rect(c,7,5,2,9,'#6a4a2a');
            this.itemIcons[base+2] = c.canvas;
            // Sword
            c = makeCtx(); fill(c,'rgba(0,0,0,0)');
            rect(c,7,1,2,9,col); rect(c,5,10,6,2,'#6a4a2a'); rect(c,7,12,2,3,'#6a4a2a');
            this.itemIcons[base+3] = c.canvas;
            // Hoe
            c = makeCtx(); fill(c,'rgba(0,0,0,0)');
            rect(c,4,1,8,2,col); rect(c,7,3,2,11,'#6a4a2a');
            this.itemIcons[base+4] = c.canvas;
        }

        // Material icons
        const matColors = {200:'#8a6a3a',201:'#333',202:'#ddd',203:'#ffd700',204:'#5decf5',
            205:'#ff0000',206:'#17dd62',207:'#8a5a2a',208:'#ff9999',209:'#cc8866',
            210:'#cc4444',211:'#aa6644',212:'#ffaaaa',213:'#ddaa88',214:'#eee',
            215:'#ddd',216:'#f0f0e0',217:'#888',218:'#7aaa4a',219:'#8a6a3a',
            220:'#f0f0f0',221:'#888',222:'#d4a050',223:'#cc3333'};
        for (const [id, color] of Object.entries(matColors)) {
            const c = makeCtx(); fill(c,'rgba(0,0,0,0)');
            rect(c,4,4,8,8,color); rect(c,5,5,6,6,color);
            this.itemIcons[parseInt(id)] = c.canvas;
        }
    }

    getUV(blockId, face) {
        const fm = this.faceMap[blockId];
        if (!fm) return { u: 0, v: 0, s: 1/this.texPerRow };
        let idx;
        if (face === 'top') idx = fm.top;
        else if (face === 'bottom') idx = fm.bottom;
        else idx = fm.side;
        
        // Lazy load texture
        const texName = this.texList[idx];
        if (texName) this.loadTexture(texName);

        const s = 1 / this.texPerRow;
        return {
            u: (idx % this.texPerRow) * s,
            v: Math.floor(idx / this.texPerRow) * s,
            s: s
        };
    }

    getThreeTexture() {
        if (!this.threeTex) {
            this.threeTex = new THREE.CanvasTexture(this.atlas);
            this.threeTex.magFilter = THREE.NearestFilter;
            this.threeTex.minFilter = THREE.NearestFilter;
            this.threeTex.colorSpace = THREE.SRGBColorSpace;
            this.threeTex.flipY = false;
        }
        return this.threeTex;
    }

    getItemIcon(itemId) {
        return this.itemIcons[itemId] || null;
    }
}

window.TextureManager = TextureManager;
})();
