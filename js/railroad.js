// js/railroad.js - Railroad system and minecarts
(function() {
'use strict';

class Minecart {
    constructor(x, y, z, scene) {
        this.pos = { x, y, z };
        this.vel = { x: 0, y: 0, z: 0 };
        this.yaw = 0;
        this.mesh = this.createMesh();
        this.scene = scene;
        if (this.mesh) {
            this.mesh.position.set(x, y, z);
            scene.add(this.mesh);
        }
        
        this.width = 0.9;
        this.height = 0.7;
        this.speed = 0;
        this.maxSpeed = 8;
        this.onRail = false;
        this.rider = null;
    }
    
    createMesh() {
        // Simple box for minecart
        const geo = new THREE.BoxGeometry(1, 0.7, 1);
        const mat = new THREE.MeshLambertMaterial({ color: 0x888888 });
        
        // hollow out top
        const innerGeo = new THREE.BoxGeometry(0.8, 0.7, 0.8);
        innerGeo.translate(0, 0.1, 0);
        // We'll just use a solid box for now to keep it simple without CSG
        
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    }
    
    update(dt, world) {
        const cx = Math.floor(this.pos.x);
        const cy = Math.floor(this.pos.y);
        const cz = Math.floor(this.pos.z);
        
        // Check if on rail
        let railBlock = world.getBlock(cx, cy, cz);
        let onSlope = false;
        
        // Check slightly below too
        if (railBlock !== 39 && railBlock !== 40 && railBlock !== 60) {
            railBlock = world.getBlock(cx, cy - 1, cz);
            if (railBlock === 39 || railBlock === 40 || railBlock === 60) {
                // We are above a rail
            } else {
                railBlock = 0;
            }
        }
        
        this.onRail = (railBlock === 39 || railBlock === 40 || railBlock === 60);
        
        if (this.onRail) {
            // Simplified rail physics
            // Gravity on slopes (assuming slopes exist based on block metadata, but we don't have meta yet)
            // Just apply basic friction for now
            this.speed *= 0.98;
            
            // Powered rail boost
            if (railBlock === 40) {
                this.speed += 5 * dt;
                if (this.speed > this.maxSpeed) this.speed = this.maxSpeed;
            }
            
            // Move along current direction
            if (this.speed > 0.01) {
                this.pos.x += Math.sin(this.yaw) * this.speed * dt;
                this.pos.z += Math.cos(this.yaw) * this.speed * dt;
            } else {
                this.speed = 0;
            }
            
            // Snap to rail height
            // this.pos.y = cy + 0.5;
            
        } else {
            // Normal physics
            this.vel.y -= 25 * dt; // gravity
            this.speed *= 0.95; // friction
            
            this.pos.x += Math.sin(this.yaw) * this.speed * dt;
            this.pos.z += Math.cos(this.yaw) * this.speed * dt;
            
            this.pos.y += this.vel.y * dt;
            
            // Simple collision
            if (this.pos.y < cy) {
                const b = world.getBlock(cx, cy - 1, cz);
                if (b > 0 && window.blockMgr && window.blockMgr.isSolid(b)) {
                    this.pos.y = cy;
                    this.vel.y = 0;
                }
            }
        }
        
        if (this.mesh) {
            this.mesh.position.set(this.pos.x, this.pos.y + this.height/2, this.pos.z);
            this.mesh.rotation.y = this.yaw;
        }
        
        // Update rider
        if (this.rider) {
            this.rider.pos.x = this.pos.x;
            this.rider.pos.y = this.pos.y + 0.5;
            this.rider.pos.z = this.pos.z;
            this.rider.vel.x = 0;
            this.rider.vel.y = 0;
            this.rider.vel.z = 0;
        }
    }
    
    interact(player) {
        if (this.rider === player) {
            this.rider = null;
            player.pos.y += 1; // eject up slightly
        } else if (!this.rider) {
            this.rider = player;
            // Kickstart if stopped
            if (this.speed < 0.5) {
                this.yaw = player.yaw + Math.PI; // move where looking
                this.speed = 2;
            }
        }
    }
    
    destroy() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }
        if (this.rider) this.rider = null;
    }
}

class RailroadManager {
    constructor(scene) {
        this.scene = scene;
        this.carts = [];
    }
    
    update(dt, world, player) {
        for (let i = this.carts.length - 1; i >= 0; i--) {
            const cart = this.carts[i];
            cart.update(dt, world);
            
            // Despawn if fell out of world
            if (cart.pos.y < 0) {
                cart.destroy();
                this.carts.splice(i, 1);
            }
        }
        
        // Check player interaction with carts
        if (player.rightClicked && !player.rider) {
            // Find closest cart
            let closest = null;
            let minDist = 3;
            for (const cart of this.carts) {
                const dist = Math.hypot(cart.pos.x - player.pos.x, cart.pos.y - player.pos.y, cart.pos.z - player.pos.z);
                if (dist < minDist) {
                    minDist = dist;
                    closest = cart;
                }
            }
            if (closest) {
                closest.interact(player);
                player.rightClicked = false; // consume click
            } else if (player.targetBlock) {
                // Try to place minecart
                const inv = window.inventory; // Assume global
                if (inv) {
                    const heldItem = inv.getHeldItem(player.selectedSlot);
                    if (heldItem && heldItem.id === 221) { // Minecart item
                        const t = player.targetBlock;
                        const tb = t.block;
                        // Place on rail
                        if (tb === 39 || tb === 40 || tb === 60) {
                            this.spawnCart(t.x + 0.5, t.y + 0.5, t.z + 0.5);
                            if (player.gameMode !== 'creative') {
                                inv.removeFromSlot(player.selectedSlot, 1);
                            }
                            player.rightClicked = false;
                        }
                    }
                }
            }
        } else if (player.keys['ShiftLeft'] && player === player.rider) { // Dismount
            // Handled via interact if we had direct reference to cart, 
            // but we need to find which cart we're in
            for (const cart of this.carts) {
                if (cart.rider === player) {
                    cart.interact(player);
                    break;
                }
            }
        }
    }
    
    spawnCart(x, y, z) {
        const cart = new Minecart(x, y, z, this.scene);
        this.carts.push(cart);
        return cart;
    }
}

window.Minecart = Minecart;
window.RailroadManager = RailroadManager;
})();
