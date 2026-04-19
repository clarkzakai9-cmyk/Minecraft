// js/world.js - Chunk-based world with procedural terrain generation
(function() {
'use strict';
const CS = 16; // chunk size X/Z
const CH = 128; // chunk height
const SEA = 62; // sea level

class Chunk {
    constructor(cx, cz) {
        this.cx = cx;
        this.cz = cz;
        this.blocks = new Uint8Array(CS * CH * CS);
        this.dirty = true;
        this.mesh = null;
        this.waterMesh = null;
        this.generated = false;
        this.modified = {}; // Local coords -> blockId for save delta
    }
    idx(x, y, z) { return y * CS * CS + z * CS + x; }
    getBlock(x, y, z) {
        if (x<0||x>=CS||y<0||y>=CH||z<0||z>=CS) return 0;
        return this.blocks[this.idx(x,y,z)];
    }
    setBlock(x, y, z, id) {
        if (x<0||x>=CS||y<0||y>=CH||z<0||z>=CS) return;
        this.blocks[this.idx(x,y,z)] = id;
        this.dirty = true;
    }
}

class World {
    constructor(seed) {
        this.seed = seed || Math.floor(Math.random() * 2147483647);
        this.noise = new SimplexNoise(this.seed);
        this.noise2 = new SimplexNoise(this.seed + 1);
        this.noise3 = new SimplexNoise(this.seed + 2);
        this.chunks = {};
        this.renderDist = 6;
        this.blockMgr = null;
        this.texMgr = null;
    }

    chunkKey(cx, cz) { return cx + ',' + cz; }

    getChunk(cx, cz) { return this.chunks[this.chunkKey(cx, cz)]; }

    getBlock(x, y, z) {
        const cx = Math.floor(x / CS), cz = Math.floor(z / CS);
        const chunk = this.getChunk(cx, cz);
        if (!chunk) return 0;
        const lx = ((x % CS) + CS) % CS, lz = ((z % CS) + CS) % CS;
        return chunk.getBlock(lx, y, lz);
    }

    setBlock(x, y, z, id) {
        const cx = Math.floor(x / CS), cz = Math.floor(z / CS);
        let chunk = this.getChunk(cx, cz);
        if (!chunk) return;
        const lx = ((x % CS) + CS) % CS, lz = ((z % CS) + CS) % CS;
        chunk.setBlock(lx, y, lz, id);
        chunk.modified[lx+','+y+','+lz] = id;
        // Dirty neighboring chunks if on edge
        if (lx === 0) { const n = this.getChunk(cx-1, cz); if(n) n.dirty = true; }
        if (lx === CS-1) { const n = this.getChunk(cx+1, cz); if(n) n.dirty = true; }
        if (lz === 0) { const n = this.getChunk(cx, cz-1); if(n) n.dirty = true; }
        if (lz === CS-1) { const n = this.getChunk(cx, cz+1); if(n) n.dirty = true; }
    }

    getBiome(wx, wz) {
        const temp = this.noise2.fbm2D(wx * 0.003, wz * 0.003, 4, 2, 0.5);
        const moist = this.noise3.fbm2D(wx * 0.004, wz * 0.004, 4, 2, 0.5);
        if (temp > 0.3 && moist < -0.2) return 'desert';
        if (temp < -0.3) return 'snow';
        if (temp < -0.1 && moist > 0.1) return 'snow';
        if (moist > 0.35) return 'swamp';
        if (moist > 0.15 && temp > -0.1) return 'forest';
        if (temp > 0.1 && this.noise.noise2D(wx*0.01, wz*0.01) > 0.6) return 'mountains';
        const river = Math.abs(this.noise.noise2D(wx * 0.005, wz * 0.005));
        if (river < 0.04) return 'river';
        return 'plains';
    }

    getHeight(wx, wz) {
        const biome = this.getBiome(wx, wz);
        let h = this.noise.fbm2D(wx * 0.01, wz * 0.01, 6, 2, 0.5);
        switch(biome) {
            case 'plains': return Math.floor(SEA + 4 + h * 6);
            case 'forest': return Math.floor(SEA + 5 + h * 8);
            case 'desert': return Math.floor(SEA + 3 + h * 4);
            case 'snow': return Math.floor(SEA + 6 + h * 10);
            case 'mountains': return Math.floor(SEA + 15 + h * 30);
            case 'swamp': return Math.floor(SEA + 1 + h * 3);
            case 'river': return Math.floor(SEA - 3 + h * 2);
            default: return Math.floor(SEA + 4 + h * 6);
        }
    }

    generateChunk(cx, cz) {
        const key = this.chunkKey(cx, cz);
        if (this.chunks[key]) return this.chunks[key];
        const chunk = new Chunk(cx, cz);
        const wx0 = cx * CS, wz0 = cz * CS;

        for (let lx = 0; lx < CS; lx++) {
            for (let lz = 0; lz < CS; lz++) {
                const wx = wx0 + lx, wz = wz0 + lz;
                const biome = this.getBiome(wx, wz);
                const height = this.getHeight(wx, wz);

                for (let y = 0; y < CH; y++) {
                    let block = 0;
                    if (y === 0) {
                        block = 26; // Bedrock
                    } else if (y < 5) {
                        block = Math.random() < 0.5 ? 26 : 3; // Mixed bedrock/stone
                    } else if (y <= height) {
                        // Underground
                        if (y < height - 4) {
                            block = 3; // Stone
                            // Ores
                            if (y < 16 && this.noise.noise3D(wx*0.1, y*0.1, wz*0.1) > 0.7) block = 15; // Diamond
                            else if (y < 32 && this.noise2.noise3D(wx*0.1, y*0.1, wz*0.1) > 0.65) block = 14; // Gold
                            else if (y < 64 && this.noise3.noise3D(wx*0.08, y*0.08, wz*0.08) > 0.6) block = 13; // Iron
                            else if (y < 80 && this.noise.noise3D(wx*0.09, y*0.09, wz*0.09) > 0.55) block = 12; // Coal
                            else if (y < 16 && this.noise2.noise3D(wx*0.12, y*0.12, wz*0.12) > 0.75) block = 16; // Redstone
                            else if (y < 32 && this.noise3.noise3D(wx*0.15, y*0.15, wz*0.15) > 0.82) block = 17; // Emerald
                        } else if (y < height) {
                            // Subsurface
                            block = biome === 'desert' ? 8 : 2; // Sand or dirt
                        } else {
                            // Surface
                            switch(biome) {
                                case 'desert': block = 8; break;
                                case 'snow': block = 27; break;
                                case 'swamp': block = 2; break;
                                case 'river': block = 9; break;
                                default: block = 1; break; // Grass
                            }
                        }
                        // Cave carving
                        if (y > 5 && y < height - 1) {
                            const cave = this.noise.noise3D(wx*0.05, y*0.07, wz*0.05);
                            const cave2 = this.noise2.noise3D(wx*0.08, y*0.08, wz*0.08);
                            if (cave > 0.5 && cave2 > 0.3) block = 0;
                        }
                    } else if (y <= SEA) {
                        block = biome === 'snow' ? 28 : 9; // Ice or water
                    }
                    if (block > 0) chunk.setBlock(lx, y, lz, block);
                }
            }
        }

        // Decoration pass: trees, flowers, etc.
        this.decorateChunk(chunk, cx, cz);
        chunk.generated = true;
        chunk.dirty = true;
        this.chunks[key] = chunk;
        return chunk;
    }

    decorateChunk(chunk, cx, cz) {
        const wx0 = cx * CS, wz0 = cz * CS;
        // Use deterministic random based on chunk coords
        let rng = (cx * 73856093 ^ cz * 19349663) & 0x7fffffff;
        const rand = () => { rng = (rng * 16807) % 2147483647; return (rng & 0xffff) / 0xffff; };

        for (let lx = 2; lx < CS - 2; lx++) {
            for (let lz = 2; lz < CS - 2; lz++) {
                const wx = wx0 + lx, wz = wz0 + lz;
                const biome = this.getBiome(wx, wz);
                const height = this.getHeight(wx, wz);
                if (height <= SEA) continue;
                const surface = chunk.getBlock(lx, height, lz);
                if (surface === 0) continue;

                const r = rand();
                if (biome === 'forest' && r < 0.08) {
                    this.placeTree(chunk, lx, height + 1, lz, 'oak');
                } else if (biome === 'snow' && r < 0.05) {
                    this.placeTree(chunk, lx, height + 1, lz, 'spruce');
                } else if (biome === 'plains' && r < 0.02) {
                    this.placeTree(chunk, lx, height + 1, lz, 'oak');
                } else if (biome === 'plains' && r < 0.05) {
                    // Flowers
                    const ftype = rand() < 0.5 ? 39 : 40; // Poppy or Dandelion
                    chunk.setBlock(lx, height + 1, lz, ftype);
                } else if (biome === 'plains' && r < 0.12) {
                    chunk.setBlock(lx, height + 1, lz, 38); // Tall grass
                } else if (biome === 'desert' && r < 0.01) {
                    // Cactus
                    const h = 1 + Math.floor(rand() * 3);
                    for (let dy = 0; dy < h; dy++) chunk.setBlock(lx, height + 1 + dy, lz, 41); // Cactus
                } else if (biome === 'swamp' && r < 0.015) {
                    this.placeTree(chunk, lx, height + 1, lz, 'oak');
                } else if (biome === 'forest' && r < 0.12) {
                    chunk.setBlock(lx, height + 1, lz, 38); // Tall grass in forest
                }
            }
        }
    }

    placeTree(chunk, x, y, z, type) {
        const log = type === 'spruce' ? 35 : type === 'birch' ? 33 : 5;
        const leaf = type === 'spruce' ? 37 : 7;
        const h = type === 'spruce' ? 7 : 5;

        // Trunk
        for (let dy = 0; dy < h; dy++) {
            if (y + dy < CH) chunk.setBlock(x, y + dy, z, log);
        }
        // Leaves
        if (type === 'spruce') {
            for (let dy = 2; dy < h + 1; dy++) {
                const r = dy < h - 1 ? 2 : 1;
                if (dy === h) { chunk.setBlock(x, y + dy, z, leaf); continue; }
                for (let dx = -r; dx <= r; dx++) {
                    for (let dz = -r; dz <= r; dz++) {
                        if (dx===0 && dz===0 && dy < h) continue;
                        if (Math.abs(dx)+Math.abs(dz) > r+1) continue;
                        const bx=x+dx, bz=z+dz;
                        if (bx>=0&&bx<CS&&bz>=0&&bz<CS&&y+dy<CH) {
                            if (chunk.getBlock(bx,y+dy,bz)===0) chunk.setBlock(bx,y+dy,bz,leaf);
                        }
                    }
                }
            }
        } else {
            for (let dy = h - 3; dy <= h; dy++) {
                const r = dy < h - 1 ? 2 : 1;
                for (let dx = -r; dx <= r; dx++) {
                    for (let dz = -r; dz <= r; dz++) {
                        if (dx===0 && dz===0 && dy < h) continue;
                        if (Math.abs(dx)===r && Math.abs(dz)===r && dy >= h-1 && Math.random()>0.5) continue;
                        const bx=x+dx, bz=z+dz;
                        if (bx>=0&&bx<CS&&bz>=0&&bz<CS&&y+dy<CH) {
                            if (chunk.getBlock(bx,y+dy,bz)===0) chunk.setBlock(bx,y+dy,bz,leaf);
                        }
                    }
                }
            }
        }
    }

    updateChunks(playerX, playerZ, scene) {
        const pcx = Math.floor(playerX / CS), pcz = Math.floor(playerZ / CS);
        const needed = new Set();

        // Generate/load needed chunks
        for (let dx = -this.renderDist; dx <= this.renderDist; dx++) {
            for (let dz = -this.renderDist; dz <= this.renderDist; dz++) {
                if (dx*dx + dz*dz > this.renderDist * this.renderDist) continue;
                const cx = pcx + dx, cz = pcz + dz;
                const key = this.chunkKey(cx, cz);
                needed.add(key);
                if (!this.chunks[key]) {
                    this.generateChunk(cx, cz);
                }
            }
        }

        // Unload far chunks
        for (const key in this.chunks) {
            if (!needed.has(key)) {
                const chunk = this.chunks[key];
                if (chunk.mesh) { scene.remove(chunk.mesh); chunk.mesh.geometry.dispose(); }
                if (chunk.waterMesh) { scene.remove(chunk.waterMesh); chunk.waterMesh.geometry.dispose(); }
                delete this.chunks[key];
            }
        }
    }

    getSpawnPosition() {
        // Find a good spawn point near 0,0
        for (let r = 0; r < 100; r++) {
            for (let dx = -r; dx <= r; dx++) {
                for (let dz = -r; dz <= r; dz++) {
                    if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
                    const h = this.getHeight(dx, dz);
                    if (h > SEA + 1) return { x: dx + 0.5, y: h + 2, z: dz + 0.5 };
                }
            }
        }
        return { x: 0.5, y: 80, z: 0.5 };
    }

    // Raycast from pos in direction dir, max distance
    raycast(origin, direction, maxDist) {
        let x = Math.floor(origin.x), y = Math.floor(origin.y), z = Math.floor(origin.z);
        const stepX = direction.x >= 0 ? 1 : -1;
        const stepY = direction.y >= 0 ? 1 : -1;
        const stepZ = direction.z >= 0 ? 1 : -1;
        let tMaxX = direction.x !== 0 ? ((direction.x > 0 ? x + 1 : x) - origin.x) / direction.x : Infinity;
        let tMaxY = direction.y !== 0 ? ((direction.y > 0 ? y + 1 : y) - origin.y) / direction.y : Infinity;
        let tMaxZ = direction.z !== 0 ? ((direction.z > 0 ? z + 1 : z) - origin.z) / direction.z : Infinity;
        const tDeltaX = direction.x !== 0 ? Math.abs(1 / direction.x) : Infinity;
        const tDeltaY = direction.y !== 0 ? Math.abs(1 / direction.y) : Infinity;
        const tDeltaZ = direction.z !== 0 ? Math.abs(1 / direction.z) : Infinity;
        let dist = 0;
        let face = null;
        const prevX = x, prevY = y, prevZ = z;

        for (let i = 0; i < maxDist * 3; i++) {
            const block = this.getBlock(x, y, z);
            if (block > 0 && block !== 10 && block !== 11) {
                return { x, y, z, block, face, prevX: x - (face ? face.x : 0), prevY: y - (face ? face.y : 0), prevZ: z - (face ? face.z : 0) };
            }
            if (tMaxX < tMaxY) {
                if (tMaxX < tMaxZ) {
                    dist = tMaxX;
                    if (dist > maxDist) return null;
                    x += stepX; tMaxX += tDeltaX;
                    face = { x: stepX, y: 0, z: 0 };
                } else {
                    dist = tMaxZ;
                    if (dist > maxDist) return null;
                    z += stepZ; tMaxZ += tDeltaZ;
                    face = { x: 0, y: 0, z: stepZ };
                }
            } else {
                if (tMaxY < tMaxZ) {
                    dist = tMaxY;
                    if (dist > maxDist) return null;
                    y += stepY; tMaxY += tDeltaY;
                    face = { x: 0, y: stepY, z: 0 };
                } else {
                    dist = tMaxZ;
                    if (dist > maxDist) return null;
                    z += stepZ; tMaxZ += tDeltaZ;
                    face = { x: 0, y: 0, z: stepZ };
                }
            }
        }
        return null;
    }
}

window.Chunk = Chunk;
window.World = World;
window.CHUNK_SIZE = CS;
window.CHUNK_HEIGHT = CH;
window.SEA_LEVEL = SEA;
})();
