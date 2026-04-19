// js/mobs.js - Simple Mob AI and rendering
(function() {
'use strict';

class Mob {
    constructor(type, x, y, z, scene) {
        this.type = type;
        this.pos = { x, y, z };
        this.vel = { x: 0, y: 0, z: 0 };
        this.yaw = Math.random() * Math.PI * 2;
        this.mesh = this.createMesh();
        this.scene = scene;
        if (this.mesh) {
            this.mesh.position.set(x, y, z);
            scene.add(this.mesh);
        }
        
        this.width = 0.6;
        this.height = 1.8;
        this.speed = 2;
        this.health = 10;
        this.state = 'wander'; // wander, chase, flee
        this.stateTimer = 0;
        this.target = null;
        this.onGround = false;
        
        this.initType(type);
    }
    
    initType(type) {
        switch(type) {
            case 'pig':
                this.width = 0.9; this.height = 0.9; this.speed = 1.5;
                break;
            case 'zombie':
                this.speed = 2.2; this.health = 20;
                break;
            case 'creeper':
                this.speed = 2.0; this.health = 20;
                break;
        }
    }
    
    createMesh() {
        const geo = new THREE.BoxGeometry(this.width, this.height, this.width);
        const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
        
        let texPath = '';
        if (this.type === 'pig') { texPath = 'entites/pig/pig_temperate.png'; }
        else if (this.type === 'zombie') { texPath = 'entites/zombie/zombie.png'; }
        else if (this.type === 'creeper') { texPath = 'entites/creeper/creeper.png'; }
        
        if (texPath) {
            const loader = new THREE.TextureLoader();
            loader.load(texPath, (tex) => {
                tex.magFilter = THREE.NearestFilter;
                tex.minFilter = THREE.NearestFilter;
                mat.map = tex;
                mat.needsUpdate = true;
            }, undefined, (err) => {
                // fallback to solid colors if local textures fail
                if (this.type === 'pig') mat.color.setHex(0xffaaaa);
                if (this.type === 'zombie') mat.color.setHex(0x005500);
                if (this.type === 'creeper') mat.color.setHex(0x00ff00);
            });
        }
        
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    }
    
    update(dt, world, player) {
        this.stateTimer -= dt;
        
        // AI Logic
        if (this.type === 'zombie' || this.type === 'creeper') {
            const distToPlayer = Math.hypot(player.pos.x - this.pos.x, player.pos.z - this.pos.z);
            if (distToPlayer < 16 && player.gameMode === 'survival') {
                this.state = 'chase';
                this.target = player.pos;
            } else {
                this.state = 'wander';
            }
        }
        
        if (this.state === 'wander') {
            if (this.stateTimer <= 0) {
                this.yaw = Math.random() * Math.PI * 2;
                this.stateTimer = 2 + Math.random() * 4;
                // Sometimes just stand still
                if (Math.random() < 0.4) this.vel.x = this.vel.z = 0;
            }
            if (this.vel.x !== 0 || this.vel.z !== 0) {
                this.vel.x = -Math.sin(this.yaw) * this.speed * 0.5;
                this.vel.z = -Math.cos(this.yaw) * this.speed * 0.5;
            }
        } else if (this.state === 'chase' && this.target) {
            const dx = this.target.x - this.pos.x;
            const dz = this.target.z - this.pos.z;
            this.yaw = Math.atan2(dx, dz); // simple looking
            
            this.vel.x = Math.sin(this.yaw) * this.speed;
            this.vel.z = Math.cos(this.yaw) * this.speed;
            
            // Basic jump over blocks
            const nx = this.pos.x + this.vel.x * dt;
            const nz = this.pos.z + this.vel.z * dt;
            const blockInFront = world.getBlock(Math.floor(nx), Math.floor(this.pos.y), Math.floor(nz));
            if (blockInFront > 0 && this.onGround) {
                this.vel.y = 7;
                this.onGround = false;
            }
        }
        
        // Physics
        this.vel.y -= 25 * dt; // gravity
        
        // Move with collision (simplified version of player collision)
        this.pos.x += this.vel.x * dt;
        if (this.checkCollision(world)) { this.pos.x -= this.vel.x * dt; this.vel.x = 0; }
        
        this.pos.z += this.vel.z * dt;
        if (this.checkCollision(world)) { this.pos.z -= this.vel.z * dt; this.vel.z = 0; }
        
        this.pos.y += this.vel.y * dt;
        if (this.checkCollision(world)) {
            this.pos.y -= this.vel.y * dt;
            if (this.vel.y < 0) this.onGround = true;
            this.vel.y = 0;
        } else {
            this.onGround = false;
        }
        
        if (this.mesh) {
            this.mesh.position.set(this.pos.x, this.pos.y + this.height/2, this.pos.z);
            this.mesh.rotation.y = this.yaw;
        }
    }
    
    checkCollision(world) {
        const hw = this.width / 2;
        const minX = Math.floor(this.pos.x - hw);
        const maxX = Math.floor(this.pos.x + hw);
        const minY = Math.floor(this.pos.y);
        const maxY = Math.floor(this.pos.y + this.height);
        const minZ = Math.floor(this.pos.z - hw);
        const maxZ = Math.floor(this.pos.z + hw);

        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                for (let z = minZ; z <= maxZ; z++) {
                    const b = world.getBlock(x, y, z);
                    if (b > 0 && window.blockMgr && window.blockMgr.isSolid(b)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    
    destroy() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }
    }
}

class MobManager {
    constructor(scene) {
        this.scene = scene;
        this.mobs = [];
        this.spawnTimer = 0;
        this.maxMobs = 20;
    }
    
    update(dt, world, player) {
        // Update existing mobs
        for (let i = this.mobs.length - 1; i >= 0; i--) {
            const mob = this.mobs[i];
            mob.update(dt, world, player);
            
            // Remove far mobs or dead mobs
            const dist = Math.hypot(mob.pos.x - player.pos.x, mob.pos.z - player.pos.z);
            if (dist > 128 || mob.health <= 0 || mob.pos.y < 0) {
                mob.destroy();
                this.mobs.splice(i, 1);
            }
        }
        
        // Spawn new mobs
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0 && this.mobs.length < this.maxMobs) {
            this.spawnTimer = 5;
            this.attemptSpawn(world, player);
        }
    }
    
    attemptSpawn(world, player) {
        // Spawn 24-48 blocks away
        const angle = Math.random() * Math.PI * 2;
        const dist = 24 + Math.random() * 24;
        const sx = Math.floor(player.pos.x + Math.cos(angle) * dist);
        const sz = Math.floor(player.pos.z + Math.sin(angle) * dist);
        
        // Find surface
        let sy = 120;
        while (sy > 0 && world.getBlock(sx, sy, sz) === 0) sy--;
        sy++; // go up to empty space
        
        if (world.getBlock(sx, sy, sz) === 0 && world.getBlock(sx, sy+1, sz) === 0) {
            const types = ['pig', 'pig', 'zombie', 'creeper'];
            const type = types[Math.floor(Math.random() * types.length)];
            const mob = new Mob(type, sx + 0.5, sy, sz + 0.5, this.scene);
            this.mobs.push(mob);
        }
    }

    playerClick(camera, player) {
        if (!camera) return false;
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        const mobMeshes = this.mobs.map(m => m.mesh).filter(m => m);
        const intersects = raycaster.intersectObjects(mobMeshes);
        
        if (intersects.length > 0 && intersects[0].distance < player.reach) {
            const hitMesh = intersects[0].object;
            const mob = this.mobs.find(m => m.mesh === hitMesh);
            if (mob) {
                mob.health -= 5;
                mob.vel.y = 5; // knockback
                mob.vel.x = -Math.sin(player.yaw) * 5;
                mob.vel.z = -Math.cos(player.yaw) * 5;
                mob.onGround = false;
                
                // Blink red
                if (mob.mesh.material) {
                    const oldEmissive = mob.mesh.material.emissive.getHex();
                    mob.mesh.material.emissive.setHex(0xff0000);
                    setTimeout(() => {
                        if (mob.mesh) mob.mesh.material.emissive.setHex(oldEmissive);
                    }, 200);
                }
                return true;
            }
        }
        return false;
    }
}

window.Mob = Mob;
window.MobManager = MobManager;
})();
