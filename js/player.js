// js/player.js - First-person player with physics and block interaction
(function() {
'use strict';

class Player {
    constructor(world, blockMgr) {
        this.world = world;
        this.blockMgr = blockMgr;
        this.pos = { x: 0, y: 80, z: 0 };
        this.vel = { x: 0, y: 0, z: 0 };
        this.yaw = 0;
        this.pitch = 0;
        this.width = 0.6;
        this.height = 1.8;
        this.eyeHeight = 1.62;
        this.onGround = false;
        this.health = 20;
        this.maxHealth = 20;
        this.hunger = 20;
        this.maxHunger = 20;
        this.xp = 0;
        this.gameMode = 'survival'; // 'survival' or 'creative'
        this.speed = 4.3;
        this.sprintSpeed = 5.6;
        this.jumpVel = 8;
        this.gravity = 25;
        this.flying = false;
        this.sprinting = false;
        this.crouching = false;
        this.sensitivity = 0.002;
        this.reach = 5;
        this.breakProgress = 0;
        this.breakTarget = null;
        this.breakTime = 0;
        this.selectedSlot = 0;

        // Input state
        this.keys = {};
        this.mouseDX = 0;
        this.mouseDY = 0;
        this.leftDown = false;
        this.rightDown = false;
        this.rightClicked = false;

        // Camera
        this.camera = null;

        // Target block highlight
        this.targetBlock = null;
        this.highlightMesh = null;
    }

    init(camera) {
        this.camera = camera;
        // Create highlight wireframe cube
        const geo = new THREE.BoxGeometry(1.005, 1.005, 1.005);
        const edges = new THREE.EdgesGeometry(geo);
        this.highlightMesh = new THREE.LineSegments(edges,
            new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 }));
        this.highlightMesh.visible = false;
        return this.highlightMesh;
    }

    setupControls(canvas) {
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'Space' && this.gameMode === 'creative' && !this.onGround) {
                this.flying = !this.flying;
            }
        });
        document.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === canvas) {
                this.mouseDX += e.movementX;
                this.mouseDY += e.movementY;
            }
        });
        canvas.addEventListener('mousedown', (e) => {
            if (document.pointerLockElement !== canvas) {
                canvas.requestPointerLock();
                return;
            }
            if (e.button === 0) this.leftDown = true;
            if (e.button === 2) { this.rightDown = true; this.rightClicked = true; }
        });
        canvas.addEventListener('mouseup', (e) => {
            if (e.button === 0) { this.leftDown = false; this.breakProgress = 0; this.breakTarget = null; }
            if (e.button === 2) this.rightDown = false;
        });
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        canvas.addEventListener('wheel', (e) => {
            this.selectedSlot = ((this.selectedSlot + Math.sign(e.deltaY)) % 9 + 9) % 9;
        });
    }

    update(dt, inventory) {
        // Mouse look
        this.yaw -= this.mouseDX * this.sensitivity;
        this.pitch -= this.mouseDY * this.sensitivity;
        this.pitch = Math.max(-Math.PI/2 + 0.01, Math.min(Math.PI/2 - 0.01, this.pitch));
        this.mouseDX = 0;
        this.mouseDY = 0;

        // Movement
        this.sprinting = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
        this.crouching = this.keys['ControlLeft'] || this.keys['ControlRight'];
        const speed = this.sprinting ? this.sprintSpeed : (this.crouching ? this.speed * 0.3 : this.speed);

        const forward = { x: -Math.sin(this.yaw), z: -Math.cos(this.yaw) };
        const right = { x: Math.cos(this.yaw), z: -Math.sin(this.yaw) };

        let mx = 0, mz = 0;
        if (this.keys['KeyW']) { mx += forward.x; mz += forward.z; }
        if (this.keys['KeyS']) { mx -= forward.x; mz -= forward.z; }
        if (this.keys['KeyA']) { mx -= right.x; mz -= right.z; }
        if (this.keys['KeyD']) { mx += right.x; mz += right.z; }

        const len = Math.sqrt(mx*mx + mz*mz);
        if (len > 0) { mx /= len; mz /= len; }

        this.vel.x = mx * speed;
        this.vel.z = mz * speed;

        // Check ground contact explicitly
        const hw = this.width / 2;
        const groundY = this.pos.y - 0.01;
        let isOnGround = false;
        
        const minX = Math.floor(this.pos.x - hw + 0.001);
        const maxX = Math.floor(this.pos.x + hw - 0.001);
        const minZ = Math.floor(this.pos.z - hw + 0.001);
        const maxZ = Math.floor(this.pos.z + hw - 0.001);
        const gY = Math.floor(groundY);
        
        for (let x = minX; x <= maxX; x++) {
            for (let z = minZ; z <= maxZ; z++) {
                const b = this.world.getBlock(x, gY, z);
                if (b > 0 && this.blockMgr.isSolid(b)) {
                    isOnGround = true;
                    break;
                }
            }
            if (isOnGround) break;
        }
        
        this.onGround = isOnGround;

        if (this.flying) {
            this.vel.y = 0;
            if (this.keys['Space']) this.vel.y = speed;
            if (this.keys['ControlLeft']) this.vel.y = -speed;
        } else {
            if (!this.onGround) {
                this.vel.y -= this.gravity * dt;
            } else {
                if (this.vel.y < 0) this.vel.y = 0;
            }
            
            if (this.keys['Space'] && this.onGround) {
                this.vel.y = this.jumpVel;
                this.onGround = false;
            }
        }

        // Apply velocity with collision
        this.moveWithCollision(dt);

        // Update camera
        if (this.camera) {
            this.camera.position.set(this.pos.x, this.pos.y + this.eyeHeight, this.pos.z);
            this.camera.rotation.order = 'YXZ';
            this.camera.rotation.y = this.yaw;
            this.camera.rotation.x = this.pitch;
            this.camera.rotation.z = 0;
        }

        // Raycast for target block
        this.updateTargetBlock();

        // Block breaking and attacking
        if (this.leftDown) {
            let hitMob = false;
            // Check if we just clicked (not holding)
            if (!this.wasLeftDown) {
                if (window.mainGame && window.mainGame.mobMgr) {
                    hitMob = window.mainGame.mobMgr.playerClick(this.camera, this);
                }
            }
            
            if (!hitMob && this.targetBlock) {
                const t = this.targetBlock;
                if (!this.breakTarget || this.breakTarget.x !== t.x || this.breakTarget.y !== t.y || this.breakTarget.z !== t.z) {
                    this.breakTarget = { x: t.x, y: t.y, z: t.z };
                    this.breakProgress = 0;
                    const heldItem = inventory ? inventory.getHeldItem(this.selectedSlot) : null;
                    const toolId = heldItem ? heldItem.id : null;
                    this.breakTime = this.blockMgr.getBreakTime(t.block, toolId);
                }
                if (this.gameMode === 'creative') {
                    this.breakBlock(t, inventory);
                } else {
                    this.breakProgress += dt;
                    if (this.breakProgress >= this.breakTime) {
                        this.breakBlock(t, inventory);
                    }
                }
            }
        }
        this.wasLeftDown = this.leftDown;

        // Block placing
        if (this.rightClicked && this.targetBlock) {
            this.placeBlock(this.targetBlock, inventory);
            this.rightClicked = false;
        } else {
            this.rightClicked = false;
        }

        // Hunger drain
        if (this.gameMode === 'survival') {
            this.hunger = Math.max(0, this.hunger - dt * 0.01);
            if (this.hunger > 18 && this.health < this.maxHealth) {
                this.health = Math.min(this.maxHealth, this.health + dt * 0.5);
            }
            if (this.hunger <= 0) {
                this.health = Math.max(0, this.health - dt * 0.1);
            }
        }

        // Hotbar number keys
        for (let i = 0; i < 9; i++) {
            if (this.keys['Digit' + (i + 1)]) this.selectedSlot = i;
        }
    }

    breakBlock(target, inventory) {
        const dropId = this.blockMgr.getDropId(target.block);
        this.world.setBlock(target.x, target.y, target.z, 0);
        if (inventory && dropId > 0) {
            inventory.addItem(dropId, 1);
        }
        this.breakProgress = 0;
        this.breakTarget = null;
        if (window.audioMgr) window.audioMgr.playBreak();
    }

    placeBlock(target, inventory) {
        if (!target.face) return;
        const px = target.x - target.face.x;
        const py = target.y - target.face.y;
        const pz = target.z - target.face.z;

        // Don't place inside player
        const hw = this.width / 2;
        if (px + 1 > this.pos.x - hw && px < this.pos.x + hw &&
            py + 1 > this.pos.y && py < this.pos.y + this.height &&
            pz + 1 > this.pos.z - hw && pz < this.pos.z + hw) return;

        const heldItem = inventory ? inventory.getHeldItem(this.selectedSlot) : null;
        if (!heldItem || !this.blockMgr.isBlock(heldItem.id) || heldItem.id === 0) return;

        this.world.setBlock(px, py, pz, heldItem.id);
        if (this.gameMode !== 'creative') {
            inventory.removeFromSlot(this.selectedSlot, 1);
        }
        if (window.audioMgr) window.audioMgr.playPlace();
    }

    moveWithCollision(dt) {
        const hw = this.width / 2;
        // Move X
        this.pos.x += this.vel.x * dt;
        if (this.checkCollision()) {
            this.pos.x -= this.vel.x * dt;
            this.vel.x = 0;
        }
        // Move Z
        this.pos.z += this.vel.z * dt;
        if (this.checkCollision()) {
            this.pos.z -= this.vel.z * dt;
            this.vel.z = 0;
        }
        // Move Y
        const prevY = this.pos.y;
        this.pos.y += this.vel.y * dt;
        if (this.checkCollision()) {
            if (this.vel.y < 0) {
                this.pos.y = Math.floor(this.pos.y) + 1;
                if (this.vel.y < -10 && this.gameMode === 'survival') {
                    const damage = Math.floor((-this.vel.y - 10) * 0.5);
                    this.health = Math.max(0, this.health - damage);
                }
                this.vel.y = 0;
            } else if (this.vel.y > 0) {
                this.pos.y = Math.floor(this.pos.y + this.height) - this.height - 0.001;
                this.vel.y = 0;
            } else {
                // Pushed into a block horizontally while on ground, or stuck
                this.pos.y = Math.floor(this.pos.y) + 1;
            }
        }

        // Clamp to world bounds
        if (this.pos.y < 0) { this.pos.y = 80; this.vel.y = 0; }
    }

    checkCollision() {
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
                    const b = this.world.getBlock(x, y, z);
                    if (b > 0 && this.blockMgr.isSolid(b)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    updateTargetBlock() {
        if (!this.camera) return;
        const dir = new THREE.Vector3(0, 0, -1);
        dir.applyQuaternion(this.camera.quaternion);
        const origin = { x: this.pos.x, y: this.pos.y + this.eyeHeight, z: this.pos.z };
        this.targetBlock = this.world.raycast(origin, dir, this.reach);

        if (this.targetBlock && this.highlightMesh) {
            this.highlightMesh.visible = true;
            this.highlightMesh.position.set(this.targetBlock.x + 0.5, this.targetBlock.y + 0.5, this.targetBlock.z + 0.5);
        } else if (this.highlightMesh) {
            this.highlightMesh.visible = false;
        }
    }

    takeDamage(amount) {
        if (this.gameMode === 'creative') return;
        this.health = Math.max(0, this.health - amount);
    }

    serialize() {
        return {
            pos: { ...this.pos },
            yaw: this.yaw, pitch: this.pitch,
            health: this.health, hunger: this.hunger,
            xp: this.xp, gameMode: this.gameMode,
            selectedSlot: this.selectedSlot
        };
    }

    deserialize(data) {
        if (!data) return;
        this.pos = data.pos || this.pos;
        this.yaw = data.yaw || 0;
        this.pitch = data.pitch || 0;
        this.health = data.health ?? 20;
        this.hunger = data.hunger ?? 20;
        this.xp = data.xp || 0;
        this.gameMode = data.gameMode || 'survival';
        this.selectedSlot = data.selectedSlot || 0;
    }
}

window.Player = Player;
})();
