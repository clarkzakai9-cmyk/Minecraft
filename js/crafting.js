// js/crafting.js - Crafting system and recipes
(function() {
'use strict';

class CraftingSystem {
    constructor(blockMgr, inventory) {
        this.blockMgr = blockMgr;
        this.inventory = inventory;
        
        // Crafting grid state (3x3 max)
        this.gridSize = 2; // 2x2 by default, 3x3 when using crafting table
        this.grid = new Array(9).fill(null).map(() => ({ id: 0, count: 0 }));
        this.outputSlot = { id: 0, count: 0 };
        
        // Define recipes
        // shape: array of strings or null for shapeless
        // ingredients: map of char to item ID (for shaped) or array of IDs (for shapeless)
        // result: { id, count }
        this.recipes = [
            // Planks from logs
            { shape: null, ingredients: [5], result: { id: 6, count: 4 } }, // Oak
            { shape: null, ingredients: [33], result: { id: 34, count: 4 } }, // Birch
            { shape: null, ingredients: [35], result: { id: 36, count: 4 } }, // Spruce
            
            // Sticks from planks
            { shape: ['P', 'P'], ingredients: { 'P': 6 }, result: { id: 200, count: 4 } },
            { shape: ['P', 'P'], ingredients: { 'P': 34 }, result: { id: 200, count: 4 } },
            { shape: ['P', 'P'], ingredients: { 'P': 36 }, result: { id: 200, count: 4 } },
            
            // Crafting Table
            { shape: ['PP', 'PP'], ingredients: { 'P': 6 }, result: { id: 29, count: 1 } },
            
            // Torch
            { shape: ['C', 'S'], ingredients: { 'C': 201, 'S': 200 }, result: { id: 32, count: 4 } },
            
            // Chest
            { shape: ['PPP', 'P P', 'PPP'], ingredients: { 'P': 6 }, result: { id: 31, count: 1 } },
            
            // Furnace
            { shape: ['CCC', 'C C', 'CCC'], ingredients: { 'C': 4 }, result: { id: 30, count: 1 } },
            
            // Pickaxes (Wood, Stone, Iron, Gold, Diamond)
            { shape: ['PPP', ' S ', ' S '], ingredients: { 'P': 6, 'S': 200 }, result: { id: 100, count: 1 } },
            { shape: ['CCC', ' S ', ' S '], ingredients: { 'C': 4, 'S': 200 }, result: { id: 105, count: 1 } },
            { shape: ['III', ' S ', ' S '], ingredients: { 'I': 202, 'S': 200 }, result: { id: 110, count: 1 } },
            { shape: ['GGG', ' S ', ' S '], ingredients: { 'G': 203, 'S': 200 }, result: { id: 115, count: 1 } },
            { shape: ['DDD', ' S ', ' S '], ingredients: { 'D': 204, 'S': 200 }, result: { id: 120, count: 1 } },
            
            // Rails
            { shape: ['I I', 'ISI', 'I I'], ingredients: { 'I': 202, 'S': 200 }, result: { id: 39, count: 16 } },
        ];
    }
    
    setGridSize(size) {
        this.gridSize = size;
        this.updateOutput();
    }
    
    placeInGrid(index, id, count) {
        if (index < 0 || index >= this.gridSize * this.gridSize) return;
        this.grid[index].id = id;
        this.grid[index].count = count;
        this.updateOutput();
    }
    
    updateOutput() {
        this.outputSlot.id = 0;
        this.outputSlot.count = 0;
        
        for (const recipe of this.recipes) {
            if (this.matchRecipe(recipe)) {
                this.outputSlot.id = recipe.result.id;
                this.outputSlot.count = recipe.result.count;
                return;
            }
        }
    }
    
    matchRecipe(recipe) {
        if (recipe.shape) return this.matchShaped(recipe);
        return this.matchShapeless(recipe);
    }
    
    matchShaped(recipe) {
        const rh = recipe.shape.length;
        const rw = recipe.shape[0].length;
        if (rh > this.gridSize || rw > this.gridSize) return false;
        
        // Find bounds of items in grid
        let minX = this.gridSize, minY = this.gridSize, maxX = -1, maxY = -1;
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                if (this.grid[y * 3 + x].count > 0) {
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                }
            }
        }
        
        // Empty grid?
        if (maxX === -1) return false;
        
        const gh = maxY - minY + 1;
        const gw = maxX - minX + 1;
        
        if (gh !== rh || gw !== rw) return false;
        
        for (let y = 0; y < rh; y++) {
            for (let x = 0; x < rw; x++) {
                const char = recipe.shape[y][x];
                const expectedId = char === ' ' ? 0 : recipe.ingredients[char];
                const gridItem = this.grid[(minY + y) * 3 + (minX + x)];
                if ((expectedId === 0 && gridItem.count > 0) || 
                    (expectedId !== 0 && gridItem.id !== expectedId)) {
                    return false;
                }
            }
        }
        return true;
    }
    
    matchShapeless(recipe) {
        const reqs = [...recipe.ingredients];
        
        for (let i = 0; i < this.gridSize * this.gridSize; i++) {
            const item = this.grid[i];
            if (item.count > 0) {
                const reqIdx = reqs.indexOf(item.id);
                if (reqIdx === -1) return false;
                reqs.splice(reqIdx, 1);
            }
        }
        return reqs.length === 0;
    }
    
    craft() {
        if (this.outputSlot.count === 0) return null;
        
        const result = { id: this.outputSlot.id, count: this.outputSlot.count };
        
        // Consume ingredients
        for (let i = 0; i < this.gridSize * this.gridSize; i++) {
            if (this.grid[i].count > 0) {
                this.grid[i].count--;
                if (this.grid[i].count === 0) this.grid[i].id = 0;
            }
        }
        
        this.updateOutput();
        return result;
    }
    
    clearGrid() {
        for (let i = 0; i < 9; i++) {
            if (this.grid[i].count > 0) {
                this.inventory.addItem(this.grid[i].id, this.grid[i].count);
                this.grid[i].count = 0;
                this.grid[i].id = 0;
            }
        }
        this.updateOutput();
    }
}

window.CraftingSystem = CraftingSystem;
})();
