// js/inventory.js - Player inventory and hotbar management
(function() {
'use strict';

class Inventory {
    constructor(blockMgr, size = 36) {
        this.blockMgr = blockMgr;
        this.size = size;
        this.slots = new Array(size).fill(null).map(() => ({ id: 0, count: 0 }));
        // slots 0-8 are hotbar
        this.draggedItem = null;
        this.isOpen = false;
        
        // Give some starting items for testing
        this.slots[0] = { id: 3, count: 64 }; // Stone
        this.slots[1] = { id: 5, count: 64 }; // Oak Log
        this.slots[2] = { id: 18, count: 64 }; // Glass
        this.slots[3] = { id: 32, count: 64 }; // Torch
        this.slots[4] = { id: 100, count: 1 }; // Wooden Pickaxe
        this.slots[5] = { id: 39, count: 64 }; // Rail
        this.slots[6] = { id: 221, count: 1 }; // Minecart
        this.slots[7] = { id: 53, count: 64 }; // TNT
        this.slots[8] = { id: 29, count: 64 }; // Crafting table
    }

    getHeldItem(hotbarIndex) {
        if (hotbarIndex < 0 || hotbarIndex > 8) return null;
        return this.slots[hotbarIndex].count > 0 ? this.slots[hotbarIndex] : null;
    }

    addItem(id, count) {
        const stackSize = this.blockMgr.getStackSize(id);
        
        // First try to add to existing stacks
        for (let i = 0; i < this.size; i++) {
            if (this.slots[i].id === id && this.slots[i].count < stackSize) {
                const space = stackSize - this.slots[i].count;
                if (count <= space) {
                    this.slots[i].count += count;
                    return 0; // all added
                } else {
                    this.slots[i].count = stackSize;
                    count -= space;
                }
            }
        }
        
        // Then try to find empty slots
        for (let i = 0; i < this.size; i++) {
            if (this.slots[i].count === 0) {
                this.slots[i].id = id;
                if (count <= stackSize) {
                    this.slots[i].count = count;
                    return 0; // all added
                } else {
                    this.slots[i].count = stackSize;
                    count -= stackSize;
                }
            }
        }
        
        return count; // leftover
    }

    removeFromSlot(index, count) {
        if (index < 0 || index >= this.size) return 0;
        const slot = this.slots[index];
        if (slot.count < count) {
            const removed = slot.count;
            slot.count = 0;
            slot.id = 0;
            return removed;
        }
        slot.count -= count;
        if (slot.count === 0) slot.id = 0;
        return count;
    }

    swapSlots(idx1, idx2) {
        const tempId = this.slots[idx1].id;
        const tempCount = this.slots[idx1].count;
        this.slots[idx1].id = this.slots[idx2].id;
        this.slots[idx1].count = this.slots[idx2].count;
        this.slots[idx2].id = tempId;
        this.slots[idx2].count = tempCount;
    }

    clickSlot(index, isRightClick) {
        const slot = this.slots[index];
        
        if (!this.draggedItem) {
            // Pick up item
            if (slot.count > 0) {
                if (isRightClick) {
                    // Split stack
                    const half = Math.ceil(slot.count / 2);
                    this.draggedItem = { id: slot.id, count: half };
                    slot.count -= half;
                    if (slot.count === 0) slot.id = 0;
                } else {
                    // Pick up all
                    this.draggedItem = { id: slot.id, count: slot.count };
                    slot.count = 0;
                    slot.id = 0;
                }
            }
        } else {
            // Place item
            if (slot.count === 0) {
                if (isRightClick) {
                    // Place one
                    slot.id = this.draggedItem.id;
                    slot.count = 1;
                    this.draggedItem.count--;
                    if (this.draggedItem.count === 0) this.draggedItem = null;
                } else {
                    // Place all
                    slot.id = this.draggedItem.id;
                    slot.count = this.draggedItem.count;
                    this.draggedItem = null;
                }
            } else if (slot.id === this.draggedItem.id) {
                const stackSize = this.blockMgr.getStackSize(slot.id);
                if (isRightClick) {
                    // Place one in stack
                    if (slot.count < stackSize) {
                        slot.count++;
                        this.draggedItem.count--;
                        if (this.draggedItem.count === 0) this.draggedItem = null;
                    }
                } else {
                    // Merge stacks
                    const space = stackSize - slot.count;
                    const transfer = Math.min(space, this.draggedItem.count);
                    slot.count += transfer;
                    this.draggedItem.count -= transfer;
                    if (this.draggedItem.count === 0) this.draggedItem = null;
                }
            } else {
                // Swap items (only on left click)
                if (!isRightClick) {
                    const temp = { id: slot.id, count: slot.count };
                    slot.id = this.draggedItem.id;
                    slot.count = this.draggedItem.count;
                    this.draggedItem = temp;
                }
            }
        }
    }

    serialize() {
        return {
            slots: this.slots.map(s => ({...s}))
        };
    }

    deserialize(data) {
        if (!data || !data.slots) return;
        for (let i = 0; i < Math.min(this.size, data.slots.length); i++) {
            this.slots[i] = {...data.slots[i]};
        }
    }
}

window.Inventory = Inventory;
})();
