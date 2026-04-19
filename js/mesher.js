// js/mesher.js - Greedy meshing for chunk geometry
(function() {
'use strict';
const CS = 16, CH = 128;

class ChunkMesher {
    constructor(world, texMgr, blockMgr) {
        this.world = world;
        this.texMgr = texMgr;
        this.blockMgr = blockMgr;
    }

    buildMesh(chunk, scene) {
        if (chunk.mesh) { scene.remove(chunk.mesh); chunk.mesh.geometry.dispose(); }
        if (chunk.waterMesh) { scene.remove(chunk.waterMesh); chunk.waterMesh.geometry.dispose(); }

        const verts = [], uvs = [], normals = [], indices = [];
        const wVerts = [], wUvs = [], wNormals = [], wIndices = [];
        const wx0 = chunk.cx * CS, wz0 = chunk.cz * CS;

        // Face definitions: [axis, dir, du, dv, normal]
        const faces = [
            { axis: 0, dir: 1,  name: 'px', normal: [1,0,0] },   // +X
            { axis: 0, dir: -1, name: 'nx', normal: [-1,0,0] },  // -X
            { axis: 1, dir: 1,  name: 'py', normal: [0,1,0] },   // +Y (top)
            { axis: 1, dir: -1, name: 'ny', normal: [0,-1,0] },  // -Y (bottom)
            { axis: 2, dir: 1,  name: 'pz', normal: [0,0,1] },   // +Z
            { axis: 2, dir: -1, name: 'nz', normal: [0,0,-1] },  // -Z
        ];

        for (const face of faces) {
            this.buildFace(chunk, face, verts, uvs, normals, indices, wVerts, wUvs, wNormals, wIndices);
        }
        
        this.buildDecorations(chunk, verts, uvs, normals, indices);

        // Build solid mesh
        if (verts.length > 0) {
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
            geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
            geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
            geo.setIndex(indices);
            const mat = new THREE.MeshLambertMaterial({
                map: this.texMgr.getThreeTexture(),
                alphaTest: 0.5,
                transparent: false,
                side: THREE.FrontSide
            });
            chunk.mesh = new THREE.Mesh(geo, mat);
            chunk.mesh.position.set(wx0, 0, wz0);
            scene.add(chunk.mesh);
        }

        // Build water mesh
        if (wVerts.length > 0) {
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.Float32BufferAttribute(wVerts, 3));
            geo.setAttribute('uv', new THREE.Float32BufferAttribute(wUvs, 2));
            geo.setAttribute('normal', new THREE.Float32BufferAttribute(wNormals, 3));
            geo.setIndex(wIndices);
            const mat = new THREE.MeshLambertMaterial({
                map: this.texMgr.getThreeTexture(),
                transparent: true,
                opacity: 0.6,
                side: THREE.DoubleSide
            });
            chunk.waterMesh = new THREE.Mesh(geo, mat);
            chunk.waterMesh.position.set(wx0, 0, wz0);
            scene.add(chunk.waterMesh);
        }

        chunk.dirty = false;
    }

    buildFace(chunk, face, verts, uvs, normals, indices, wV, wU, wN, wI) {
        const { axis, dir, normal } = face;
        const isTop = axis === 1 && dir === 1;
        const isBottom = axis === 1 && dir === -1;

        for (let y = 0; y < CH; y++) {
            for (let z = 0; z < CS; z++) {
                for (let x = 0; x < CS; x++) {
                    const blockId = chunk.getBlock(x, y, z);
                    if (blockId === 0) continue;

                    const bDef = this.blockMgr.getBlock(blockId);
                    if (bDef && bDef.cat === 3) continue; // Skip DECORATION blocks

                    // Get neighbor position
                    let nx = x, ny = y, nz = z;
                    if (axis === 0) nx += dir;
                    else if (axis === 1) ny += dir;
                    else nz += dir;

                    // Get neighbor block (possibly from adjacent chunk)
                    let neighbor;
                    if (nx < 0 || nx >= CS || nz < 0 || nz >= CS) {
                        const wx = chunk.cx * CS + nx, wz = chunk.cz * CS + nz;
                        neighbor = this.world.getBlock(wx, ny, wz);
                    } else if (ny < 0 || ny >= CH) {
                        neighbor = 0;
                    } else {
                        neighbor = chunk.getBlock(nx, ny, nz);
                    }

                    // Skip face if neighbor is opaque (and same type for liquids)
                    const isLiquid = this.blockMgr.isLiquid(blockId);
                    const neighborTransparent = this.blockMgr.isTransparent(neighbor);
                    const neighborLiquid = this.blockMgr.isLiquid(neighbor);

                    if (isLiquid) {
                        if (neighborLiquid) continue; // Same liquid, skip
                        if (!neighborTransparent && !neighborLiquid) continue;
                    } else {
                        if (!neighborTransparent) continue; // Neighbor is opaque, skip
                    }

                    // Determine face type for UV
                    let faceType = 'side';
                    if (isTop) faceType = 'top';
                    else if (isBottom) faceType = 'bottom';

                    const uv = this.texMgr.getUV(blockId, faceType);
                    const target = isLiquid ? { v: wV, u: wU, n: wN, i: wI } : { v: verts, u: uvs, n: normals, i: indices };
                    const vi = target.v.length / 3;

                    // Generate quad vertices based on face direction
                    this.addQuad(x, y, z, axis, dir, uv, normal, target);
                }
            }
        }
    }

    addQuad(x, y, z, axis, dir, uv, normal, target) {
        const vi = target.v.length / 3;
        let v0, v1, v2, v3;

        if (axis === 0) { // X face
            if (dir > 0) { // +X
                v0 = [x+1, y, z]; v1 = [x+1, y, z+1]; v2 = [x+1, y+1, z+1]; v3 = [x+1, y+1, z];
            } else { // -X
                v0 = [x, y, z+1]; v1 = [x, y, z]; v2 = [x, y+1, z]; v3 = [x, y+1, z+1];
            }
        } else if (axis === 1) { // Y face
            if (dir > 0) { // +Y
                v0 = [x, y+1, z+1]; v1 = [x+1, y+1, z+1]; v2 = [x+1, y+1, z]; v3 = [x, y+1, z];
            } else { // -Y
                v0 = [x, y, z]; v1 = [x+1, y, z]; v2 = [x+1, y, z+1]; v3 = [x, y, z+1];
            }
        } else { // Z face
            if (dir > 0) { // +Z
                v0 = [x+1, y, z+1]; v1 = [x, y, z+1]; v2 = [x, y+1, z+1]; v3 = [x+1, y+1, z+1];
            } else { // -Z
                v0 = [x, y, z]; v1 = [x+1, y, z]; v2 = [x+1, y+1, z]; v3 = [x, y+1, z];
            }
        }

        target.v.push(...v0, ...v1, ...v2, ...v3);
        target.n.push(...normal, ...normal, ...normal, ...normal);

        const u0 = uv.u, v0uv = uv.v, s = uv.s;
        target.u.push(u0, v0uv + s, u0 + s, v0uv + s, u0 + s, v0uv, u0, v0uv);

        target.i.push(vi, vi+1, vi+2, vi, vi+2, vi+3);
    }

    buildDecorations(chunk, verts, uvs, normals, indices) {
        for (let y = 0; y < CH; y++) {
            for (let z = 0; z < CS; z++) {
                for (let x = 0; x < CS; x++) {
                    const blockId = chunk.getBlock(x, y, z);
                    if (blockId === 0) continue;
                    
                    const bDef = this.blockMgr.getBlock(blockId);
                    if (!bDef || bDef.cat !== 3) continue; // Only DECORATION

                    const uv = this.texMgr.getUV(blockId, 'side');
                    const u0 = uv.u, v0 = uv.v, s = uv.s;
                    
                    // Cross plane 1 (diagonal)
                    let vi = verts.length / 3;
                    verts.push(
                        x, y, z,
                        x+1, y, z+1,
                        x+1, y+1, z+1,
                        x, y+1, z
                    );
                    normals.push(0,1,0, 0,1,0, 0,1,0, 0,1,0);
                    uvs.push(u0, v0+s, u0+s, v0+s, u0+s, v0, u0, v0);
                    indices.push(vi, vi+1, vi+2, vi, vi+2, vi+3); // Front
                    indices.push(vi, vi+2, vi+1, vi, vi+3, vi+2); // Back

                    // Cross plane 2 (opposite diagonal)
                    vi = verts.length / 3;
                    verts.push(
                        x+1, y, z,
                        x, y, z+1,
                        x, y+1, z+1,
                        x+1, y+1, z
                    );
                    normals.push(0,1,0, 0,1,0, 0,1,0, 0,1,0);
                    uvs.push(u0, v0+s, u0+s, v0+s, u0+s, v0, u0, v0);
                    indices.push(vi, vi+1, vi+2, vi, vi+2, vi+3); // Front
                    indices.push(vi, vi+2, vi+1, vi, vi+3, vi+2); // Back
                }
            }
        }
    }
}

window.ChunkMesher = ChunkMesher;
})();
