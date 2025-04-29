// TSP Game: The Route Challenge - Main Script
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const globeContainer = document.getElementById('globe-container');
    const pathSequence = document.getElementById('path-sequence');
    const totalDistance = document.getElementById('total-distance');
    const totalEnergy = document.getElementById('total-energy');
    const countriesVisited = document.getElementById('countries-visited');
    const countryTooltip = document.getElementById('country-tooltip');
    const resetBtn = document.getElementById('reset-btn');
    const optimizeBtn = document.getElementById('optimize-btn');
    const completeBtn = document.getElementById('complete-btn');
    const completionModal = document.getElementById('completion-modal');
    const resultDistance = document.getElementById('result-distance');
    const resultEnergy = document.getElementById('result-energy');
    const resultCountries = document.getElementById('result-countries');
    const resultPath = document.getElementById('result-path');
    const newGameBtn = document.getElementById('new-game-btn');

    // Game state
    const gameState = {
        selectedCountries: [],
        path: [],
        totalDistance: 0,
        energyUsed: 0,
        isComplete: false,
        hoveredCountry: null
    };

    // Country node data - using major cities with their coordinates
    const countryNodes = [
        { id: 1, name: "New York", lat: 40.7128, lng: -74.0060, color: 0x00e5ff },
        { id: 2, name: "London", lat: 51.5074, lng: -0.1278, color: 0x00e5ff },
        { id: 3, name: "Tokyo", lat: 35.6762, lng: 139.6503, color: 0x00e5ff },
        { id: 4, name: "Sydney", lat: -33.8688, lng: 151.2093, color: 0x00e5ff },
        { id: 5, name: "Rio de Janeiro", lat: -22.9068, lng: -43.1729, color: 0x00e5ff },
        { id: 6, name: "Cairo", lat: 30.0444, lng: 31.2357, color: 0x00e5ff },
        { id: 7, name: "Moscow", lat: 55.7558, lng: 37.6173, color: 0x00e5ff },
        { id: 8, name: "Beijing", lat: 39.9042, lng: 116.4074, color: 0x00e5ff },
        { id: 9, name: "Mumbai", lat: 19.0760, lng: 72.8777, color: 0x00e5ff },
        { id: 10, name: "Cape Town", lat: -33.9249, lng: 18.4241, color: 0x00e5ff },
        { id: 11, name: "Mexico City", lat: 19.4326, lng: -99.1332, color: 0x00e5ff },
        { id: 12, name: "Berlin", lat: 52.5200, lng: 13.4050, color: 0x00e5ff }
    ];

    // Three.js Variables
    let scene, camera, renderer, globe, nodes = [], lines = [], raycaster, mouse;
    const GLOBE_RADIUS = 100;
    const NODE_RADIUS = 2;
    const SELECTED_COLOR = 0xff00ff;
    const HOVER_COLOR = 0xffff00;
    const DEFAULT_COLOR = 0x00e5ff;
    const LINE_COLOR = 0x00e5ff;
    const SELECTED_LINE_COLOR = 0xff00ff;

    // Initialize Three.js scene
    function initScene() {
        // Create scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0e17);

        // Create camera
        camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 250;

        // Create renderer
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        globeContainer.appendChild(renderer.domElement);

        // Create raycaster for mouse interaction
        raycaster = new THREE.Raycaster();
        mouse = new THREE.Vector2();

        // Create ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 1);
        scene.add(ambientLight);

        // Create directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(1, 1, 1);
        scene.add(directionalLight);

        // Create globe
        createGlobe();

        // Create country nodes
        createNodes();

        // Add event listeners
        window.addEventListener('resize', onWindowResize);
        renderer.domElement.addEventListener('mousemove', onMouseMove);
        renderer.domElement.addEventListener('click', onMouseClick);
    }

    // Create the globe
    function createGlobe() {
        const globeGeometry = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);
        const globeTexture = new THREE.TextureLoader().load('https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg');
        const globeMaterial = new THREE.MeshPhongMaterial({
            map: globeTexture,
            transparent: true,
            opacity: 0.8
        });
        globe = new THREE.Mesh(globeGeometry, globeMaterial);
        scene.add(globe);

        // Add atmosphere glow
        const atmosphereGeometry = new THREE.SphereGeometry(GLOBE_RADIUS + 2, 64, 64);
        const atmosphereMaterial = new THREE.ShaderMaterial({
            vertexShader: `
                varying vec3 vNormal;
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                varying vec3 vNormal;
                void main() {
                    float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 4.0);
                    gl_FragColor = vec4(0.3, 0.7, 1.0, 1.0) * intensity;
                }
            `,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide
        });
        const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
        scene.add(atmosphere);
    }

    // Create nodes for each country
    function createNodes() {
        countryNodes.forEach(country => {
            const position = latLongToVector3(country.lat, country.lng, GLOBE_RADIUS);
            
            // Create glow sphere
            const glowGeometry = new THREE.SphereGeometry(NODE_RADIUS * 2, 16, 16);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: country.color,
                transparent: true,
                opacity: 0.3
            });
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            glow.position.copy(position);
            scene.add(glow);
            
            // Create node
            const nodeGeometry = new THREE.SphereGeometry(NODE_RADIUS, 16, 16);
            const nodeMaterial = new THREE.MeshBasicMaterial({ color: country.color });
            const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
            node.position.copy(position);
            node.userData = {
                id: country.id,
                name: country.name,
                lat: country.lat,
                lng: country.lng,
                selected: false,
                originalColor: country.color,
                glow: glow
            };
            scene.add(node);
            nodes.push(node);
            
            // Create pulsing animation for glow
            animateGlow(glow);
        });
    }

    // Convert lat/long to 3D vector for positioning on globe
    function latLongToVector3(lat, lng, radius) {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lng + 180) * (Math.PI / 180);
        
        const x = -radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.sin(theta);
        
        return new THREE.Vector3(x, y, z);
    }

    // Animate glow effect
    function animateGlow(glow) {
        const timeline = gsap.timeline({ repeat: -1 });
        timeline.to(glow.scale, {
            x: 1.5,
            y: 1.5,
            z: 1.5,
            duration: 1.5,
            ease: "power1.inOut"
        });
        timeline.to(glow.scale, {
            x: 1,
            y: 1,
            z: 1,
            duration: 1.5,
            ease: "power1.inOut"
        });
    }

    // Handle window resize
    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    // Handle mouse movement
    function onMouseMove(event) {
        event.preventDefault();
        
        // Calculate mouse position in normalized device coordinates
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Update tooltip position
        countryTooltip.style.left = `${event.clientX + 15}px`;
        countryTooltip.style.top = `${event.clientY + 15}px`;
        
        // Check for node intersections
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(nodes);
        
        // Reset previously hovered node
        if (gameState.hoveredCountry && gameState.hoveredCountry.userData.id !== (intersects[0]?.object.userData.id || null)) {
            if (!gameState.hoveredCountry.userData.selected) {
                gameState.hoveredCountry.material.color.setHex(gameState.hoveredCountry.userData.originalColor);
            }
            gameState.hoveredCountry = null;
            countryTooltip.style.opacity = "0";
        }
        
        // Handle new hover
        if (intersects.length > 0) {
            const hoveredNode = intersects[0].object;
            if (!hoveredNode.userData.selected) {
                hoveredNode.material.color.setHex(HOVER_COLOR);
            }
            gameState.hoveredCountry = hoveredNode;
            
            // Update tooltip
            countryTooltip.textContent = hoveredNode.userData.name;
            countryTooltip.style.opacity = "1";
        }
    }

    // Handle mouse click
    function onMouseClick(event) {
        if (gameState.isComplete) return;
        
        // Get clicked node
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(nodes);
        
        if (intersects.length > 0) {
            const clickedNode = intersects[0].object;
            const nodeId = clickedNode.userData.id;
            
            // Check if node is already selected
            if (gameState.path.includes(nodeId)) {
                return;
            }
            
            // Select node
            selectNode(clickedNode);
            
            // Rotate globe to center on selected node
            rotateGlobeToNode(clickedNode);
            
            // Update path
            updatePath();
            
            // Play sound effect
            playSelectSound();
        }
    }

    // Select a node
    function selectNode(node) {
        // Mark node as selected
        node.userData.selected = true;
        node.material.color.setHex(SELECTED_COLOR);
        
        // Add node to selected list
        gameState.selectedCountries.push({
            id: node.userData.id,
            name: node.userData.name,
            position: node.position.clone()
        });
        
        // Add node ID to path
        gameState.path.push(node.userData.id);
        
        // If this is not the first node, add a line to previous node
        if (gameState.selectedCountries.length > 1) {
            addLine(
                gameState.selectedCountries[gameState.selectedCountries.length - 2].position,
                gameState.selectedCountries[gameState.selectedCountries.length - 1].position
            );
            
            // Calculate distance
            calculateDistance();
        }
        
        // Update UI
        updateUI();
    }

    // Add line between nodes
    function addLine(startPos, endPos) {
        const material = new THREE.LineBasicMaterial({
            color: gameState.selectedCountries.length % 2 === 0 ? LINE_COLOR : SELECTED_LINE_COLOR,
            linewidth: 2
        });
        
        const points = [];
        points.push(startPos);
        
        // Add curve to line
        const midPoint = new THREE.Vector3().addVectors(startPos, endPos).multiplyScalar(0.5);
        midPoint.normalize();
        midPoint.multiplyScalar(GLOBE_RADIUS * 1.2);
        points.push(midPoint);
        
        points.push(endPos);
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, material);
        scene.add(line);
        lines.push(line);
    }

    // Calculate distance between nodes
    function calculateDistance() {
        const lastIdx = gameState.selectedCountries.length - 1;
        const start = gameState.selectedCountries[lastIdx - 1];
        const end = gameState.selectedCountries[lastIdx];
        
        // Use Haversine formula to calculate distance
        const distance = calculateHaversineDistance(
            start.lat || countryNodes.find(n => n.id === start.id).lat,
            start.lng || countryNodes.find(n => n.id === start.id).lng,
            end.lat || countryNodes.find(n => n.id === end.id).lat,
            end.lng || countryNodes.find(n => n.id === end.id).lng
        );
        
        gameState.totalDistance += distance;
        gameState.energyUsed += Math.round(distance / 100);
    }

    // Calculate Haversine distance (great-circle distance between two points)
    function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
            
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    // Update UI
    function updateUI() {
        // Update path display
        if (gameState.path.length === 0) {
            pathSequence.textContent = "Start your journey";
        } else {
            pathSequence.textContent = gameState.path.join(" → ");
        }
        
        // Update stats
        totalDistance.textContent = `${Math.round(gameState.totalDistance)} km`;
        totalEnergy.textContent = `${gameState.energyUsed} units`;
        countriesVisited.textContent = gameState.selectedCountries.length;
    }

    // Update path display
    function updatePath() {
        if (gameState.path.length === 0) {
            pathSequence.textContent = "Start your journey";
        } else {
            pathSequence.textContent = gameState.path.join(" → ");
        }
    }

    // Rotate globe to center on a node
    function rotateGlobeToNode(node) {
        const position = node.position.clone();
        const targetRotation = new THREE.Euler().setFromVector3(position);
        
        gsap.to(globe.rotation, {
            x: -position.y * 0.01,
            y: position.x * 0.01,
            duration: 1,
            ease: "power2.out"
        });
    }

    // Complete the route (return to start)
    function completeRoute() {
        if (gameState.selectedCountries.length < 2) {
            alert("Please select at least 2 countries before completing route");
            return;
        }
        
        // Get first and last nodes
        const firstNode = gameState.selectedCountries[0];
        const lastNode = gameState.selectedCountries[gameState.selectedCountries.length - 1];
        
        // Add line from last to first
        addLine(lastNode.position, firstNode.position);
        
        // Calculate final distance
        const finalDistance = calculateHaversineDistance(
            countryNodes.find(n => n.id === lastNode.id).lat,
            countryNodes.find(n => n.id === lastNode.id).lng,
            countryNodes.find(n => n.id === firstNode.id).lat,
            countryNodes.find(n => n.id === firstNode.id).lng
        );
        
        gameState.totalDistance += finalDistance;
        gameState.energyUsed += Math.round(finalDistance / 100);
        
        // Add first node to path again
        gameState.path.push(firstNode.id);
        
        // Update UI
        updateUI();
        
        // Mark game as complete
        gameState.isComplete = true;
        
        // Show completion modal
        showCompletionModal();
    }

    // Reset the game
    function resetGame() {
        // Reset game state
        gameState.selectedCountries = [];
        gameState.path = [];
        gameState.totalDistance = 0;
        gameState.energyUsed = 0;
        gameState.isComplete = false;
        
        // Reset UI
        updateUI();
        
        // Reset nodes
        nodes.forEach(node => {
            node.userData.selected = false;
            node.material.color.setHex(node.userData.originalColor);
        });
        
        // Remove lines
        lines.forEach(line => {
            scene.remove(line);
        });
        lines = [];
        
        // Hide completion modal if visible
        completionModal.classList.remove('active');
    }

    // Show completion modal
    function showCompletionModal() {
        resultDistance.textContent = `${Math.round(gameState.totalDistance)} km`;
        resultEnergy.textContent = gameState.energyUsed;
        resultCountries.textContent = gameState.selectedCountries.length;
        resultPath.textContent = gameState.path.join(" → ");
        
        // Show modal
        completionModal.classList.add('active');
    }

    // Optimize route using nearest neighbor algorithm
    function optimizeRoute() {
        if (gameState.selectedCountries.length < 2) {
            alert("Please select at least 2 countries before optimizing");
            return;
        }
        
        resetGame();
        
        // Start with first node
        const startNode = nodes[0];
        selectNode(startNode);
        
        // Use nearest neighbor algorithm
        let currentNode = startNode;
        let remainingNodes = nodes.filter(node => node !== startNode);
        
        while (remainingNodes.length > 0) {
            // Find nearest unvisited node
            let nearestNode = null;
            let nearestDistance = Infinity;
            
            for (const node of remainingNodes) {
                const distance = currentNode.position.distanceTo(node.position);
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestNode = node;
                }
            }
            
            // Select nearest node
            selectNode(nearestNode);
            rotateGlobeToNode(nearestNode);
            
            // Update current node and remaining nodes
            currentNode = nearestNode;
            remainingNodes = remainingNodes.filter(node => node !== nearestNode);
        }
        
        // Complete route back to start
        completeRoute();
    }

    // Play sound effect when selecting node
    function playSelectSound() {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
    }

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        
        // Slowly rotate the globe
        if (!gameState.hoveredCountry) {
            globe.rotation.y += 0.001;
        }
        
        renderer.render(scene, camera);
    }

    // Initialize the scene and start animation
    initScene();
    animate();

    // Event listeners for buttons
    resetBtn.addEventListener('click', resetGame);
    optimizeBtn.addEventListener('click', optimizeRoute);
    completeBtn.addEventListener('click', completeRoute);
    newGameBtn.addEventListener('click', resetGame);
});
