// js/save.js - IndexedDB save system
(function() {
'use strict';

class SaveSystem {
    constructor() {
        this.dbName = 'MinecraftJS_Saves';
        this.dbVersion = 1;
        this.db = null;
    }

    init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = (e) => reject('IndexedDB error: ' + e.target.error);
            
            request.onsuccess = (e) => {
                this.db = e.target.result;
                resolve();
            };
            
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                
                // Store metadata about worlds
                if (!db.objectStoreNames.contains('worlds')) {
                    db.createObjectStore('worlds', { keyPath: 'id' });
                }
                
                // Store modified chunks (key is worldId_cx_cz)
                if (!db.objectStoreNames.contains('chunks')) {
                    db.createObjectStore('chunks', { keyPath: 'id' });
                }
            };
        });
    }

    getWorlds() {
        return new Promise((resolve, reject) => {
            if (!this.db) return resolve([]);
            
            const trans = this.db.transaction(['worlds'], 'readonly');
            const store = trans.objectStore('worlds');
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    saveWorld(worldId, metadata, chunks, player, inventory) {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject('DB not initialized');
            
            const trans = this.db.transaction(['worlds', 'chunks'], 'readwrite');
            
            // Save metadata
            const worldStore = trans.objectStore('worlds');
            const worldData = {
                id: worldId,
                name: metadata.name || worldId,
                seed: metadata.seed,
                lastPlayed: Date.now(),
                player: player.serialize(),
                inventory: inventory.serialize(),
                timeOfDay: metadata.timeOfDay || 6000
            };
            worldStore.put(worldData);
            
            // Save chunks
            const chunkStore = trans.objectStore('chunks');
            for (const key in chunks) {
                const chunk = chunks[key];
                // Only save modified chunks
                if (Object.keys(chunk.modified).length > 0) {
                    chunkStore.put({
                        id: worldId + '_' + key,
                        worldId: worldId,
                        cx: chunk.cx,
                        cz: chunk.cz,
                        modified: chunk.modified
                    });
                }
            }
            
            trans.oncomplete = () => resolve();
            trans.onerror = () => reject(trans.error);
        });
    }

    loadWorld(worldId) {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject('DB not initialized');
            
            const trans = this.db.transaction(['worlds', 'chunks'], 'readonly');
            
            let worldData = null;
            let chunksData = [];
            
            const worldReq = trans.objectStore('worlds').get(worldId);
            worldReq.onsuccess = () => { worldData = worldReq.result; };
            
            const chunkStore = trans.objectStore('chunks');
            // We have to iterate to get all chunks for this worldId since we didn't make an index
            const cursorReq = chunkStore.openCursor();
            cursorReq.onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor) {
                    if (cursor.value.worldId === worldId) {
                        chunksData.push(cursor.value);
                    }
                    cursor.continue();
                }
            };
            
            trans.oncomplete = () => {
                if (worldData) resolve({ world: worldData, chunks: chunksData });
                else reject('World not found');
            };
            trans.onerror = () => reject(trans.error);
        });
    }

    deleteWorld(worldId) {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject('DB not initialized');
            
            const trans = this.db.transaction(['worlds', 'chunks'], 'readwrite');
            
            trans.objectStore('worlds').delete(worldId);
            
            // Delete chunks
            const chunkStore = trans.objectStore('chunks');
            const cursorReq = chunkStore.openCursor();
            cursorReq.onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor) {
                    if (cursor.value.worldId === worldId) {
                        cursor.delete();
                    }
                    cursor.continue();
                }
            };
            
            trans.oncomplete = () => resolve();
            trans.onerror = () => reject(trans.error);
        });
    }
}

window.SaveSystem = SaveSystem;
})();
