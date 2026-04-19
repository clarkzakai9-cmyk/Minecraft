// js/main.js - Main game loop and initialization
(function() {
'use strict';

class Game {
    constructor() {
        window.mainGame = this;
        this.canvas = document.getElementById('game-canvas');
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        
        this.blockMgr = new BlockManager();
        this.texMgr = new TextureManager();
        this.world = null;
        this.mesher = null;
        this.player = null;
        this.inventory = null;
        this.crafting = null;
        this.mobMgr = null;
        this.railMgr = null;
        this.weatherSystem = null;
        this.audioMgr = new AudioSystem();
        this.saveMgr = new SaveSystem();
        this.ui = null;
        
        this.worldId = null;
        this.lastTime = performance.now();
        this.running = false;
        
        // Expose to window for other modules
        window.audioMgr = this.audioMgr;
        window.blockMgr = this.blockMgr;
    }

    async init() {
        this.ui = new UIManager(this);
        this.ui.setState('menu');
        
        try {
            await this.saveMgr.init();
        } catch(e) {
            console.error('Failed to init SaveSystem:', e);
        }
        
        // Build textures
        await this.texMgr.buildAtlas();
        
        // Init Three.js
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio > 1 ? 1 : 1); // Limit pixel ratio for perf
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
        
        // Setup systems
        this.inventory = new Inventory(this.blockMgr);
        window.inventory = this.inventory;
        this.crafting = new CraftingSystem(this.blockMgr, this.inventory);
        this.player = new Player(null, this.blockMgr); // world not created yet
        this.player.setupControls(this.canvas);
        const hm = this.player.init(this.camera);
        this.scene.add(hm);
        
        this.audioMgr.init();
        
        // Start main loop
        requestAnimationFrame((t) => this.loop(t));
    }

    async startNewWorld(id, seed) {
        this.worldId = id;
        this.ui.setState('loading');
        this.ui.setLoadingProgress(10, 'Generating World...');
        
        // Cleanup old scene
        if (this.world) {
            for (const key in this.world.chunks) {
                const chunk = this.world.chunks[key];
                if (chunk.mesh) { this.scene.remove(chunk.mesh); chunk.mesh.geometry.dispose(); }
                if (chunk.waterMesh) { this.scene.remove(chunk.waterMesh); chunk.waterMesh.geometry.dispose(); }
            }
        }
        if (this.weatherSystem) {
            this.scene.remove(this.weatherSystem.ambientLight);
            this.scene.remove(this.weatherSystem.sunLight);
            this.scene.remove(this.weatherSystem.particles);
        }
        if (this.mobMgr) {
            this.mobMgr.mobs.forEach(m => m.destroy());
        }
        if (this.railMgr) {
            this.railMgr.carts.forEach(c => c.destroy());
        }
        
        // Reset inventory
        this.inventory = new Inventory(this.blockMgr);
        window.inventory = this.inventory;
        this.crafting = new CraftingSystem(this.blockMgr, this.inventory);
        
        // Init world
        this.world = new World(seed);
        this.world.blockMgr = this.blockMgr;
        this.world.texMgr = this.texMgr;
        this.mesher = new ChunkMesher(this.world, this.texMgr, this.blockMgr);
        this.player.world = this.world;
        
        // Wait a frame for UI to update
        await new Promise(r => setTimeout(r, 10));
        
        const spawn = this.world.getSpawnPosition();
        this.player.pos = spawn;
        
        // Pre-generate initial chunks
        this.ui.setLoadingProgress(30, 'Generating Terrain...');
        await new Promise(r => setTimeout(r, 10));
        this.world.updateChunks(this.player.pos.x, this.player.pos.z, this.scene);
        
        const chunksToMesh = Object.values(this.world.chunks).filter(c => c.dirty);
        for (let i = 0; i < chunksToMesh.length; i++) {
            this.mesher.buildMesh(chunksToMesh[i], this.scene);
            if (i % 2 === 0) {
                const progress = 40 + Math.floor((i / chunksToMesh.length) * 50);
                this.ui.setLoadingProgress(progress, `Meshing (${i}/${chunksToMesh.length})...`);
                await new Promise(r => setTimeout(r, 0)); // yield
            }
        }
        
        this.ui.setLoadingProgress(95, 'Initializing Systems...');
        
        this.weatherSystem = new WeatherSystem(this.scene, this.camera);
        this.mobMgr = new MobManager(this.scene);
        this.railMgr = new RailroadManager(this.scene);
        
        this.running = true;
        this.lastTime = performance.now();
        this.ui.setState('playing');
        this.audioMgr.stopBGM();
        this.audioMgr.startBGM(); // Restart BGM
    }

    async loadWorld(id) {
        this.ui.setState('loading');
        this.ui.setLoadingProgress(10, 'Loading Save Data...');
        
        try {
            const data = await this.saveMgr.loadWorld(id);
            const wData = data.world;
            
            this.worldId = id;
            
            // Cleanup
            if (this.world) {
                for (const key in this.world.chunks) {
                    const chunk = this.world.chunks[key];
                    if (chunk.mesh) { this.scene.remove(chunk.mesh); chunk.mesh.geometry.dispose(); }
                    if (chunk.waterMesh) { this.scene.remove(chunk.waterMesh); chunk.waterMesh.geometry.dispose(); }
                }
            }
            if (this.weatherSystem) {
                this.scene.remove(this.weatherSystem.ambientLight);
                this.scene.remove(this.weatherSystem.sunLight);
                this.scene.remove(this.weatherSystem.particles);
            }
            if (this.mobMgr) this.mobMgr.mobs.forEach(m => m.destroy());
            if (this.railMgr) this.railMgr.carts.forEach(c => c.destroy());
            
            // Reconstruct
            this.world = new World(wData.seed);
            this.world.blockMgr = this.blockMgr;
            this.world.texMgr = this.texMgr;
            this.mesher = new ChunkMesher(this.world, this.texMgr, this.blockMgr);
            
            this.player.world = this.world;
            this.player.deserialize(wData.player);
            
            this.inventory = new Inventory(this.blockMgr);
            this.inventory.deserialize(wData.inventory);
            window.inventory = this.inventory;
            this.crafting = new CraftingSystem(this.blockMgr, this.inventory);
            
            // Apply loaded chunks
            for (const cData of data.chunks) {
                const chunk = this.world.generateChunk(cData.cx, cData.cz);
                chunk.modified = cData.modified;
                for (const key in cData.modified) {
                    const [lx, y, lz] = key.split(',').map(Number);
                    chunk.setBlock(lx, y, lz, cData.modified[key]);
                }
            }
            
            this.world.updateChunks(this.player.pos.x, this.player.pos.z, this.scene);
            
            const chunksToMesh = Object.values(this.world.chunks).filter(c => c.dirty);
            for (let i = 0; i < chunksToMesh.length; i++) {
                this.mesher.buildMesh(chunksToMesh[i], this.scene);
                if (i % 2 === 0) {
                    const progress = 40 + Math.floor((i / chunksToMesh.length) * 50);
                    this.ui.setLoadingProgress(progress, `Meshing (${i}/${chunksToMesh.length})...`);
                    await new Promise(r => setTimeout(r, 0)); // yield
                }
            }
            
            this.weatherSystem = new WeatherSystem(this.scene, this.camera);
            this.weatherSystem.timeOfDay = wData.timeOfDay;
            this.mobMgr = new MobManager(this.scene);
            this.railMgr = new RailroadManager(this.scene);
            
            this.running = true;
            this.lastTime = performance.now();
            this.ui.setState('playing');
            this.ui.showToast('World Loaded');
            
        } catch(e) {
            console.error('Load failed:', e);
            this.ui.setState('menu');
            alert('Failed to load world.');
        }
    }

    async saveGame() {
        if (!this.worldId) return;
        this.ui.showToast('Saving game...');
        
        try {
            await this.saveMgr.saveWorld(
                this.worldId, 
                { seed: this.world.seed, timeOfDay: this.weatherSystem.timeOfDay },
                this.world.chunks,
                this.player,
                this.inventory
            );
            this.ui.showToast('Game saved.');
        } catch(e) {
            console.error('Save failed:', e);
            this.ui.showToast('Save failed!');
        }
    }

    loop(time) {
        requestAnimationFrame((t) => this.loop(t));
        
        let dt = (time - this.lastTime) / 1000;
        this.lastTime = time;
        if (dt > 0.1) dt = 0.1; // Cap dt for lag spikes
        
        // Always render background menu scene if not running
        if (!this.running && this.scene && this.camera && this.ui.state === 'menu') {
            // Slowly rotate camera around origin
            this.camera.position.x = Math.sin(time * 0.0001) * 100;
            this.camera.position.y = 80;
            this.camera.position.z = Math.cos(time * 0.0001) * 100;
            this.camera.lookAt(0, 60, 0);
            
            // if we don't have a world, make a fake one for menu background
            if (!this.world) {
                this.world = new World(12345);
                this.mesher = new ChunkMesher(this.world, this.texMgr, this.blockMgr);
                this.world.updateChunks(0, 0, this.scene);
                for (const key in this.world.chunks) {
                    if (this.world.chunks[key].dirty) this.mesher.buildMesh(this.world.chunks[key], this.scene);
                }
                this.weatherSystem = new WeatherSystem(this.scene, this.camera);
            }
            if (this.weatherSystem) this.weatherSystem.update(dt, {pos:{x:0,y:80,z:0}});
            
            this.renderer.render(this.scene, this.camera);
            return;
        }
        
        if (this.ui.state === 'playing') {
            // Step player steps if needed (sound)
            const wasMoving = this.player.vel.x !== 0 || this.player.vel.z !== 0;
            
            this.player.update(dt, this.inventory);
            
            const isMoving = (this.player.vel.x !== 0 || this.player.vel.z !== 0) && this.player.onGround;
            if (isMoving && !this.player.stepTimer) this.player.stepTimer = 0;
            if (isMoving) {
                this.player.stepTimer += dt;
                const stepInt = this.player.sprinting ? 0.25 : 0.4;
                if (this.player.stepTimer > stepInt) {
                    this.audioMgr.playStep();
                    this.player.stepTimer = 0;
                }
            }
            
            this.world.updateChunks(this.player.pos.x, this.player.pos.z, this.scene);
            
            // Rebuild 1 dirty chunk per frame to avoid lag
            for (const key in this.world.chunks) {
                const chunk = this.world.chunks[key];
                if (chunk.dirty) {
                    this.mesher.buildMesh(chunk, this.scene);
                    break;
                }
            }
            
            this.mobMgr.update(dt, this.world, this.player);
            this.railMgr.update(dt, this.world, this.player);
            this.weatherSystem.update(dt, this.player);
            
            this.ui.updateHUD();
        } else if (this.ui.state === 'inventory') {
            // Can still update some things while in inventory
            this.weatherSystem.update(dt, this.player);
            this.mobMgr.update(dt, this.world, this.player);
        }
        
        if (this.running) {
            this.renderer.render(this.scene, this.camera);
        }
    }
}

// Start when loaded
window.onload = () => {
    const game = new Game();
    game.init();
};

})();
