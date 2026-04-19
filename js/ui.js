// js/ui.js - User Interface management
(function() {
'use strict';

class UIManager {
    constructor(game) {
        this.game = game;
        this.state = 'menu'; // menu, playing, inventory, pause, loading
        
        this.elements = {
            menu: document.getElementById('main-menu'),
            hud: document.getElementById('hud'),
            inventory: document.getElementById('inventory-screen'),
            pause: document.getElementById('pause-menu'),
            loading: document.getElementById('loading-screen'),
            settings: document.getElementById('settings-panel'),
            worlds: document.getElementById('worlds-panel')
        };
        
        this.draggedIcon = null;
        this.initEventListeners();
    }
    
    setState(newState) {
        if (this.state === newState) return;
        this.state = newState;
        
        for (const key in this.elements) {
            if (this.elements[key]) {
                this.elements[key].style.display = 'none';
            }
        }
        
        if (newState === 'menu') {
            this.elements.menu.style.display = 'flex';
            if (this.game.audioMgr) this.game.audioMgr.startBGM();
        } else if (newState === 'playing') {
            this.elements.hud.style.display = 'block';
            this.updateHUD();
            if (this.game.canvas) this.game.canvas.requestPointerLock();
        } else if (newState === 'inventory') {
            this.elements.inventory.style.display = 'flex';
            this.renderInventory();
            if (document.pointerLockElement) document.exitPointerLock();
        } else if (newState === 'pause') {
            this.elements.pause.style.display = 'flex';
            if (document.pointerLockElement) document.exitPointerLock();
        } else if (newState === 'loading') {
            this.elements.loading.style.display = 'flex';
        }
    }
    
    initEventListeners() {
        // Main Menu Buttons
        document.getElementById('btn-play').addEventListener('click', () => {
            this.showWorldsList();
        });
        
        document.getElementById('btn-new-world').addEventListener('click', () => {
            const seed = Math.floor(Math.random() * 1000000);
            this.game.startNewWorld('world_' + Date.now(), seed);
        });
        
        document.getElementById('btn-settings').addEventListener('click', () => {
            this.elements.menu.style.display = 'none';
            this.elements.settings.style.display = 'flex';
        });
        
        // Settings Back Button
        document.getElementById('btn-settings-back').addEventListener('click', () => {
            this.elements.settings.style.display = 'none';
            if (this.state === 'menu') {
                this.elements.menu.style.display = 'flex';
            } else if (this.state === 'pause') {
                this.elements.pause.style.display = 'flex';
            }
        });
        
        // Worlds Back Button
        document.getElementById('btn-worlds-back').addEventListener('click', () => {
            this.elements.worlds.style.display = 'none';
            this.elements.menu.style.display = 'flex';
        });
        
        // Pause Menu Buttons
        document.getElementById('btn-resume').addEventListener('click', () => {
            this.setState('playing');
        });
        
        document.getElementById('btn-pause-settings').addEventListener('click', () => {
            this.elements.pause.style.display = 'none';
            this.elements.settings.style.display = 'flex';
        });
        
        document.getElementById('btn-quit').addEventListener('click', () => {
            this.game.saveGame().then(() => {
                this.setState('menu');
            });
        });
        
        // Key bindings
        document.addEventListener('keydown', (e) => {
            if (e.code === 'KeyE') {
                if (this.state === 'playing') this.setState('inventory');
                else if (this.state === 'inventory') {
                    if (this.game.inventory.draggedItem) {
                        // Drop dragged item if closed (simplified: just put it back)
                        this.game.inventory.addItem(this.game.inventory.draggedItem.id, this.game.inventory.draggedItem.count);
                        this.game.inventory.draggedItem = null;
                    }
                    this.setState('playing');
                }
            } else if (e.code === 'Escape') {
                if (this.state === 'playing') this.setState('pause');
                else if (this.state === 'inventory') this.setState('playing');
                else if (this.state === 'pause') this.setState('playing');
            }
        });
        
        // Pointer lock change
        document.addEventListener('pointerlockchange', () => {
            if (document.pointerLockElement !== this.game.canvas) {
                if (this.state === 'playing') this.setState('pause');
            }
        });
        
        // Settings changes
        const setupSetting = (id, obj, prop, callback) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('change', (e) => {
                if (el.type === 'checkbox') obj[prop] = el.checked;
                else obj[prop] = parseFloat(el.value);
                if (callback) callback(obj[prop]);
            });
        };
        
        if (this.game.audioMgr) {
            setupSetting('set-music', this.game.audioMgr, 'musicEnabled', (v) => {
                if (v) this.game.audioMgr.startBGM();
                else this.game.audioMgr.stopBGM();
            });
            setupSetting('set-sound', this.game.audioMgr, 'sfxEnabled');
        }
        setupSetting('set-render-dist', this.game.world, 'renderDist');
        setupSetting('set-sens', this.game.player, 'sensitivity');
        
        // Inventory drag and drop
        document.addEventListener('mousemove', (e) => {
            if (this.state === 'inventory' && this.draggedIcon) {
                this.draggedIcon.style.left = e.clientX + 'px';
                this.draggedIcon.style.top = e.clientY + 'px';
            }
        });
    }
    
    async showWorldsList() {
        this.elements.menu.style.display = 'none';
        this.elements.worlds.style.display = 'flex';
        
        const list = document.getElementById('worlds-list');
        list.innerHTML = 'Loading...';
        
        try {
            const worlds = await this.game.saveMgr.getWorlds();
            list.innerHTML = '';
            
            if (worlds.length === 0) {
                list.innerHTML = '<div>No saved worlds found.</div>';
                return;
            }
            
            worlds.forEach(w => {
                const div = document.createElement('div');
                div.className = 'world-item';
                
                const info = document.createElement('div');
                const date = new Date(w.lastPlayed).toLocaleString();
                info.innerHTML = `<strong>${w.name}</strong><br><small>Last played: ${date}</small>`;
                div.appendChild(info);
                
                const btnPlay = document.createElement('button');
                btnPlay.textContent = 'Play';
                btnPlay.onclick = () => this.game.loadWorld(w.id);
                div.appendChild(btnPlay);
                
                const btnDel = document.createElement('button');
                btnDel.textContent = 'Delete';
                btnDel.style.backgroundColor = '#cc4444';
                btnDel.onclick = async () => {
                    if (confirm('Delete world ' + w.name + '?')) {
                        await this.game.saveMgr.deleteWorld(w.id);
                        this.showWorldsList();
                    }
                };
                div.appendChild(btnDel);
                
                list.appendChild(div);
            });
        } catch (e) {
            list.innerHTML = 'Error loading worlds.';
            console.error(e);
        }
    }
    
    updateHUD() {
        if (this.state !== 'playing') return;
        
        const player = this.game.player;
        const inv = this.game.inventory;
        const tm = this.game.texMgr;
        
        // Hotbar
        const hotbarEl = document.getElementById('hotbar-slots');
        hotbarEl.innerHTML = '';
        
        for (let i = 0; i < 9; i++) {
            const slot = inv.slots[i];
            const div = document.createElement('div');
            div.className = 'hotbar-slot' + (i === player.selectedSlot ? ' selected' : '');
            
            if (slot.count > 0) {
                const icon = tm.getItemIcon(slot.id);
                if (icon) {
                    const img = document.createElement('img');
                    img.src = icon.toDataURL();
                    div.appendChild(img);
                }
                if (slot.count > 1) {
                    const countEl = document.createElement('div');
                    countEl.className = 'item-count';
                    countEl.textContent = slot.count;
                    div.appendChild(countEl);
                }
            }
            hotbarEl.appendChild(div);
        }
        
        // Selected item name
        const held = inv.getHeldItem(player.selectedSlot);
        const nameEl = document.getElementById('selected-item-name');
        if (held) {
            nameEl.textContent = this.game.blockMgr.getItemName(held.id);
            nameEl.style.opacity = 1;
            clearTimeout(this.nameFadeTimeout);
            this.nameFadeTimeout = setTimeout(() => { nameEl.style.opacity = 0; }, 2000);
        } else {
            nameEl.textContent = '';
        }
        
        // Health/Hunger
        const hpEl = document.getElementById('health-bar');
        hpEl.innerHTML = '';
        for (let i = 0; i < 10; i++) {
            const heart = document.createElement('div');
            heart.className = 'heart';
            if (player.health >= (i+1)*2) heart.classList.add('full');
            else if (player.health > i*2) heart.classList.add('half');
            hpEl.appendChild(heart);
        }
        
        const hgEl = document.getElementById('hunger-bar');
        hgEl.innerHTML = '';
        for (let i = 0; i < 10; i++) {
            const drum = document.createElement('div');
            drum.className = 'drumstick';
            if (player.hunger >= (i+1)*2) drum.classList.add('full');
            else if (player.hunger > i*2) drum.classList.add('half');
            hgEl.appendChild(drum);
        }
    }
    
    renderInventory() {
        const inv = this.game.inventory;
        const craft = this.game.crafting;
        const tm = this.game.texMgr;
        
        const createSlotEl = (slot, index, isCrafting, isOutput) => {
            const div = document.createElement('div');
            div.className = 'inv-slot';
            
            if (slot && slot.count > 0) {
                const icon = tm.getItemIcon(slot.id);
                if (icon) {
                    const img = document.createElement('img');
                    img.src = icon.toDataURL();
                    div.appendChild(img);
                }
                if (slot.count > 1) {
                    const countEl = document.createElement('div');
                    countEl.className = 'item-count';
                    countEl.textContent = slot.count;
                    div.appendChild(countEl);
                }
            }
            
            div.addEventListener('mousedown', (e) => {
                if (isOutput) {
                    if (slot && slot.count > 0 && (!inv.draggedItem || inv.draggedItem.id === slot.id)) {
                        const res = craft.craft();
                        if (res) {
                            if (!inv.draggedItem) {
                                inv.draggedItem = { id: res.id, count: res.count };
                            } else {
                                inv.draggedItem.count += res.count;
                            }
                            if (this.game.audioMgr) this.game.audioMgr.playClick();
                        }
                    }
                } else if (isCrafting) {
                    // Quick implementation for crafting grid clicking
                    const tempDragged = inv.draggedItem;
                    if (!tempDragged) {
                        if (slot.count > 0) {
                            inv.draggedItem = { id: slot.id, count: e.button === 2 ? Math.ceil(slot.count/2) : slot.count };
                            craft.placeInGrid(index, 0, slot.count - inv.draggedItem.count);
                        }
                    } else {
                        if (slot.count === 0) {
                            craft.placeInGrid(index, tempDragged.id, e.button === 2 ? 1 : tempDragged.count);
                            tempDragged.count -= e.button === 2 ? 1 : tempDragged.count;
                            if (tempDragged.count === 0) inv.draggedItem = null;
                        } else if (slot.id === tempDragged.id) {
                            if (e.button === 2) {
                                craft.placeInGrid(index, slot.id, slot.count + 1);
                                tempDragged.count--;
                                if (tempDragged.count === 0) inv.draggedItem = null;
                            } else {
                                craft.placeInGrid(index, slot.id, slot.count + tempDragged.count);
                                inv.draggedItem = null;
                            }
                        } else if (e.button === 0) {
                            craft.placeInGrid(index, tempDragged.id, tempDragged.count);
                            inv.draggedItem = { id: slot.id, count: slot.count };
                        }
                    }
                    if (this.game.audioMgr) this.game.audioMgr.playClick();
                } else {
                    inv.clickSlot(index, e.button === 2);
                    if (this.game.audioMgr) this.game.audioMgr.playClick();
                }
                this.renderInventory();
            });
            
            // Prevent context menu
            div.addEventListener('contextmenu', e => e.preventDefault());
            return div;
        };
        
        // Update Grid UI
        const mainGrid = document.getElementById('inv-main-grid');
        mainGrid.innerHTML = '';
        for (let i = 9; i < 36; i++) {
            mainGrid.appendChild(createSlotEl(inv.slots[i], i, false, false));
        }
        
        const hotbarGrid = document.getElementById('inv-hotbar-grid');
        hotbarGrid.innerHTML = '';
        for (let i = 0; i < 9; i++) {
            hotbarGrid.appendChild(createSlotEl(inv.slots[i], i, false, false));
        }
        
        const craftGrid = document.getElementById('crafting-grid');
        craftGrid.innerHTML = '';
        craftGrid.style.gridTemplateColumns = `repeat(${craft.gridSize}, 40px)`;
        for (let i = 0; i < craft.gridSize * craft.gridSize; i++) {
            craftGrid.appendChild(createSlotEl(craft.grid[i], i, true, false));
        }
        
        const outGrid = document.getElementById('crafting-output');
        outGrid.innerHTML = '';
        outGrid.appendChild(createSlotEl(craft.outputSlot, 0, false, true));
        
        // Dragged item cursor
        if (inv.draggedItem) {
            if (!this.draggedIcon) {
                this.draggedIcon = document.createElement('div');
                this.draggedIcon.className = 'dragged-item';
                document.body.appendChild(this.draggedIcon);
            }
            this.draggedIcon.innerHTML = '';
            const icon = tm.getItemIcon(inv.draggedItem.id);
            if (icon) {
                const img = document.createElement('img');
                img.src = icon.toDataURL();
                this.draggedIcon.appendChild(img);
            }
            if (inv.draggedItem.count > 1) {
                const countEl = document.createElement('div');
                countEl.className = 'item-count';
                countEl.textContent = inv.draggedItem.count;
                this.draggedIcon.appendChild(countEl);
            }
            this.draggedIcon.style.display = 'block';
        } else if (this.draggedIcon) {
            this.draggedIcon.style.display = 'none';
        }
    }
    
    setLoadingProgress(pct, text) {
        document.getElementById('loading-bar-inner').style.width = pct + '%';
        if (text) document.getElementById('loading-text').textContent = text;
    }
    
    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        // Trigger reflow
        void toast.offsetWidth;
        toast.style.opacity = 1;
        
        setTimeout(() => {
            toast.style.opacity = 0;
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    }
}

window.UIManager = UIManager;
})();
