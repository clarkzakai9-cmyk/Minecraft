// js/weather.js - Day/night cycle and weather effects
(function() {
'use strict';

class WeatherSystem {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        
        this.timeOfDay = 6000; // 0 = midnight, 6000 = dawn, 12000 = noon, 18000 = dusk
        this.dayLength = 24000; // 20 minutes real time at 20 ticks/sec
        this.timeSpeed = 20; // real time multiplier
        
        this.weatherType = 'clear'; // clear, rain, snow
        this.weatherTimer = 12000;
        
        // Lighting
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(this.ambientLight);
        
        this.sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 0.5;
        this.sunLight.shadow.camera.far = 200;
        this.sunLight.shadow.camera.left = -50;
        this.sunLight.shadow.camera.right = 50;
        this.sunLight.shadow.camera.top = 50;
        this.sunLight.shadow.camera.bottom = -50;
        this.scene.add(this.sunLight);
        
        // Sky colors (used for fog)
        this.skyColors = {
            day: new THREE.Color(0x78a7ff),
            night: new THREE.Color(0x050511),
            sunrise: new THREE.Color(0xffa040),
            rain: new THREE.Color(0x405060)
        };
        
        // Poly Haven Sky Maps
        this.skyMaps = {};
        const tl = new THREE.TextureLoader();
        const loadSky = (name) => {
            const tex = tl.load(`https://dl.polyhaven.org/file/ph-assets/HDRIs/extra/Tonemapped%20JPG/${name}.jpg`);
            tex.mapping = THREE.EquirectangularReflectionMapping;
            tex.colorSpace = THREE.SRGBColorSpace;
            return tex;
        };
        
        this.skyMaps.day = loadSky('kloofendal_48d_partly_cloudy_puresky');
        this.skyMaps.sunrise = loadSky('qwantani_sunrise_puresky');
        this.skyMaps.night = loadSky('satara_night');
        
        this.scene.background = this.skyMaps.day;
        this.scene.fog = new THREE.Fog(this.skyColors.day, 30, 80);
        
        // Particles
        this.particles = null;
        this.initParticles();
    }
    
    initParticles() {
        // Rain/Snow particle system
        const count = 5000;
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(count * 3);
        const vel = new Float32Array(count); // downward speed
        
        for (let i = 0; i < count; i++) {
            pos[i*3] = (Math.random() - 0.5) * 60;
            pos[i*3+1] = Math.random() * 40;
            pos[i*3+2] = (Math.random() - 0.5) * 60;
            vel[i] = 10 + Math.random() * 10;
        }
        
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('velocity', new THREE.BufferAttribute(vel, 1));
        
        // Use simple points for weather
        const mat = new THREE.PointsMaterial({
            color: 0xaaaaff,
            size: 0.2,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        this.particles = new THREE.Points(geo, mat);
        this.particles.visible = false;
        this.scene.add(this.particles);
    }
    
    update(dt, player) {
        // Time update
        this.timeOfDay = (this.timeOfDay + dt * this.timeSpeed) % this.dayLength;
        
        // Sun position (0 is directly below, PI is directly above)
        const angle = (this.timeOfDay / this.dayLength) * Math.PI * 2 - Math.PI / 2;
        this.sunLight.position.set(
            Math.cos(angle) * 100 + player.pos.x,
            Math.sin(angle) * 100,
            Math.sin(angle) * 20 + player.pos.z // Slight angle
        );
        this.sunLight.target.position.set(player.pos.x, 0, player.pos.z);
        this.sunLight.target.updateMatrixWorld();
        
        // Lighting calculation based on sun height
        const sunHeight = Math.sin(angle);
        let intensity = Math.max(0.1, sunHeight); // Min intensity at night
        
        // Sky color interpolation for fog and background map
        let skyColor = new THREE.Color();
        if (this.weatherType === 'rain' || this.weatherType === 'snow') {
            skyColor.copy(this.skyColors.rain);
            intensity *= 0.6; // Darker when weather
            this.scene.background = this.skyColors.rain; // flat color for bad weather
        } else {
            if (sunHeight > 0.2) {
                skyColor.copy(this.skyColors.day);
                this.scene.background = this.skyMaps.day;
            } else if (sunHeight > -0.2) {
                // Sunrise/Sunset blend
                const t = (sunHeight + 0.2) / 0.4;
                if (this.timeOfDay < this.dayLength / 2) { // Sunrise
                    skyColor.copy(this.skyColors.night).lerp(this.skyColors.sunrise, t);
                    if (t > 0.5) skyColor.copy(this.skyColors.sunrise).lerp(this.skyColors.day, (t-0.5)*2);
                } else { // Sunset
                    skyColor.copy(this.skyColors.day).lerp(this.skyColors.sunrise, 1-t);
                    if (t < 0.5) skyColor.copy(this.skyColors.sunrise).lerp(this.skyColors.night, 1-t*2);
                }
                this.scene.background = this.skyMaps.sunrise;
            } else {
                skyColor.copy(this.skyColors.night);
                this.scene.background = this.skyMaps.night;
            }
        }
        
        this.scene.fog.color = skyColor;
        this.sunLight.intensity = Math.max(0, sunHeight);
        this.ambientLight.intensity = intensity * 0.5;
        
        // Weather transitions
        this.weatherTimer -= dt;
        if (this.weatherTimer <= 0) {
            this.weatherTimer = 6000 + Math.random() * 12000;
            if (this.weatherType === 'clear') {
                this.weatherType = Math.random() < 0.2 ? 'snow' : 'rain';
            } else {
                this.weatherType = 'clear';
            }
        }
        
        // Update particles
        if (this.weatherType !== 'clear') {
            this.particles.visible = true;
            this.particles.position.copy(player.pos);
            this.particles.position.y = 0; // Relative to player XZ, absolute Y
            
            const isRain = this.weatherType === 'rain';
            this.particles.material.color.setHex(isRain ? 0x88aaff : 0xffffff);
            this.particles.material.size = isRain ? 0.2 : 0.4;
            
            const pos = this.particles.geometry.attributes.position.array;
            const vel = this.particles.geometry.attributes.velocity.array;
            
            const fallSpeed = isRain ? 1 : 0.2;
            const yOffset = player.pos.y;
            
            for (let i = 0; i < vel.length; i++) {
                pos[i*3+1] -= vel[i] * fallSpeed * dt;
                
                // Wrap around
                if (pos[i*3+1] < yOffset - 10) {
                    pos[i*3+1] = yOffset + 30;
                }
                
                // Wind
                pos[i*3] -= 2 * dt;
                if (pos[i*3] < -30) pos[i*3] = 30;
            }
            this.particles.geometry.attributes.position.needsUpdate = true;
            
            // Adjust fog for weather
            this.scene.fog.far = isRain ? 40 : 30;
        } else {
            this.particles.visible = false;
            this.scene.fog.far = 80;
        }
    }
}

window.WeatherSystem = WeatherSystem;
})();
