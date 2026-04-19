// js/audio.js - Procedural audio generation (Web Audio API)
(function() {
'use strict';

class AudioSystem {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;
        
        this.enabled = false;
        this.musicEnabled = true;
        this.sfxEnabled = true;
        
        this.bgmOscs = [];
        this.isPlayingBGM = false;
    }
    
    init() {
        if (this.ctx) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            
            this.masterGain = this.ctx.createGain();
            this.masterGain.connect(this.ctx.destination);
            
            this.musicGain = this.ctx.createGain();
            this.musicGain.connect(this.masterGain);
            this.musicGain.gain.value = 0.3;
            
            this.sfxGain = this.ctx.createGain();
            this.sfxGain.connect(this.masterGain);
            this.sfxGain.gain.value = 0.8;
            
            this.enabled = true;
        } catch (e) {
            console.warn('Web Audio API not supported', e);
        }
    }
    
    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }
    
    // Simple noise generator for crunch sounds
    createNoiseBuffer(duration) {
        if (!this.ctx) return null;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }
    
    playBreak() {
        if (!this.enabled || !this.sfxEnabled) return;
        this.resume();
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        
        // Noise buffer
        const noiseSource = this.ctx.createBufferSource();
        noiseSource.buffer = this.createNoiseBuffer(0.2);
        
        // Routing
        noiseSource.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        
        // Params
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.15);
        
        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
        
        noiseSource.start();
        noiseSource.stop(this.ctx.currentTime + 0.2);
    }
    
    playPlace() {
        if (!this.enabled || !this.sfxEnabled) return;
        this.resume();
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.connect(gain);
        gain.connect(this.sfxGain);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.1);
        
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }
    
    playStep() {
        if (!this.enabled || !this.sfxEnabled) return;
        
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.1);
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        
        filter.type = 'bandpass';
        filter.frequency.value = 400 + Math.random() * 200;
        
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
        
        noise.start();
        noise.stop(this.ctx.currentTime + 0.1);
    }
    
    playClick() {
        if (!this.enabled || !this.sfxEnabled) return;
        this.resume();
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.connect(gain);
        gain.connect(this.sfxGain);
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(600, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.05);
        
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.05);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
    }
    
    // Very simple procedural ambient music
    startBGM() {
        if (!this.enabled || !this.musicEnabled || this.isPlayingBGM) return;
        this.isPlayingBGM = true;
        this.resume();
        
        const scale = [261.63, 293.66, 329.63, 392.00, 440.00]; // C pentatonic
        const timeOffset = this.ctx.currentTime;
        
        const playChord = (time) => {
            if (!this.isPlayingBGM) return;
            
            // 3-note chord
            for (let i = 0; i < 3; i++) {
                const freq = scale[Math.floor(Math.random() * scale.length)] * (Math.random() > 0.5 ? 0.5 : 1);
                
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                const filter = this.ctx.createBiquadFilter();
                
                osc.type = 'sine';
                osc.frequency.value = freq;
                
                filter.type = 'lowpass';
                filter.frequency.value = 800;
                
                osc.connect(filter);
                filter.connect(gain);
                gain.connect(this.musicGain);
                
                // Slow attack, long decay
                gain.gain.setValueAtTime(0, time);
                gain.gain.linearRampToValueAtTime(0.1, time + 2);
                gain.gain.exponentialRampToValueAtTime(0.001, time + 8);
                
                osc.start(time);
                osc.stop(time + 8);
                
                this.bgmOscs.push(osc);
            }
            
            // Clean up old oscillators
            setTimeout(() => {
                if (this.bgmOscs.length > 20) {
                    this.bgmOscs.splice(0, 3);
                }
            }, 9000);
            
            // Schedule next chord
            if (this.isPlayingBGM) {
                setTimeout(() => playChord(this.ctx.currentTime + 4 + Math.random() * 4), 4000);
            }
        };
        
        playChord(timeOffset);
    }
    
    stopBGM() {
        this.isPlayingBGM = false;
        for (const osc of this.bgmOscs) {
            try { osc.stop(); } catch(e) {}
        }
        this.bgmOscs = [];
    }
}

window.AudioSystem = AudioSystem;
})();
