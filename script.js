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
    
    // Create loading screen
    const loadingScreen = document.createElement('div');
    loadingScreen.className = 'loading-screen';
    loadingScreen.innerHTML = `
        <div class="loading-content">
            <h2>INITIALIZING GLOBAL NETWORK</h2>
            <div class="progress-bar">
                <div class="progress-fill"></div>
            </div>
            <p class="loading-text">Loading world data...</p>
        </div>
    `;
    document.body.appendChild(loadingScreen);

    // Game state
    const gameState = {
        selectedCountries: [],
        path: [],
        totalDistance: 0,
        energyUsed: 0,
        isComplete: false,
        hoveredCountry: null,
        isDragging: false,
        isAutoRotating: false
    };

    // Create a single AudioContext for better performance
    let audioContext;
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (error) {
        console.error("AudioContext could not be created:", error);
    }

    // Country node data - using major cities with their coordinates
    const countryNodes = [
        { id: 1, name: "New York", lat: 40.7128, lng: -74.0060, color: 0x00e5ff, info: "United States - North America" },
        { id: 2, name: "London", lat: 51.5074, lng: -0.1278, color: 0x00e5ff, info: "United Kingdom - Europe" },
        { id: 3, name: "Tokyo", lat: 35.6762, lng: 139.6503, color: 0x00e5ff, info: "Japan - Asia" },
        { id: 4, name: "Sydney", lat: -33.8688, lng: 151.2093, color: 0x00e5ff, info: "Australia - Oceania" },
        { id: 5, name: "Rio de Janeiro", lat: -22.9068, lng: -43.1729, color: 0x00e5ff, info: "Brazil - South America" },
        { id: 6, name: "Cairo", lat: 30.0444, lng: 31.2357, color: 0x00e5ff, info: "Egypt - Africa" },
        { id: 7, name: "Moscow", lat: 55.7558, lng: 37.6173, color: 0x00e5ff, info: "Russia - Europe/Asia" },
        { id: 8, name: "Beijing", lat: 39.9042, lng: 116.4074, color: 0x00e5ff, info: "China - Asia" },
        { id: 9, name: "Mumbai", lat: 19.0760, lng: 72.8777, color: 0x00e5ff, info: "India - Asia" },
        { id: 10, name: "Cape Town", lat: -33.9249, lng: 18.4241, color: 0x00e5ff, info: "South Africa - Africa" },
        { id: 11, name: "Mexico City", lat: 19.4326, lng: -99.1332, color: 0x00e5ff, info: "Mexico - North America" },
        { id: 12, name: "Berlin", lat: 52.5200, lng: 13.4050, color: 0x00e5ff, info: "Germany - Europe" }
    ];

    // Three.js Variables
    let scene, camera, renderer, globe, nodes = [], lines = [], rings = [], raycaster, mouse, controls;
    const GLOBE_RADIUS = 100;
    const NODE_RADIUS = 2;
    const SELECTED_COLOR = 0xff00ff;
    const HOVER_COLOR = 0xffff00;
    const DEFAULT_COLOR = 0x00e5ff;
    const LINE_COLOR = 0x00e5ff;
    const SELECTED_LINE_COLOR = 0xff00ff;
    let pathLines = [];
    let activePathLine = null;

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
        raycaster.params.Points.threshold = 5; // Increase threshold for easier clicking
        mouse = new THREE.Vector2();

        // Add OrbitControls for 360° user control
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableZoom = true;
        controls.enablePan = true;
        controls.enableRotate = true;
        controls.minPolarAngle = 0;
        controls.maxPolarAngle = Math.PI;
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
        controls.rotateSpeed = 0.7;
        
        // Configure mouse buttons for OrbitControls
        controls.mouseButtons = {
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN
        };

        // Disable auto-rotation initially
        controls.autoRotate = false;
        controls.autoRotateSpeed = 0.5;

        // Create ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 1);
        scene.add(ambientLight);

        // Create directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(1, 1, 1);
        scene.add(directionalLight);

        // Add point lights at different positions for more dynamic lighting
        const pointLight1 = new THREE.PointLight(0x00e5ff, 1, 300);
        pointLight1.position.set(150, 100, 50);
        scene.add(pointLight1);

        const pointLight2 = new THREE.PointLight(0xff00ff, 0.8, 300);
        pointLight2.position.set(-100, -50, 150);
        scene.add(pointLight2);

        // Load simple globe texture
        loadSimpleTextures();

        // Create country nodes
        createNodes();
        
        // Add larger hitboxes for better clicking
        createClickHitboxes();

        // Add event listeners
        window.addEventListener('resize', onWindowResize);
        renderer.domElement.addEventListener('mousemove', onMouseMove);
        renderer.domElement.addEventListener('click', onMouseClick);
        
        // Listen for control events
        controls.addEventListener('start', () => {
            gameState.isDragging = true;
            controls.autoRotate = false;
        });
        
        controls.addEventListener('end', () => {
            gameState.isDragging = false;
            if (gameState.isAutoRotating) {
                setTimeout(() => {
                    if (!gameState.isDragging) {
                        controls.autoRotate = true;
                    }
                }, 2000); // Resume auto-rotation after 2 seconds of inactivity
            }
        });

        // Initialize path line for drawing
        initPathLine();
        
        // Show initial loading animation
        simulateLoading();
    }

    // A simplified direct texture loading approach
    function loadSimpleTextures() {
        const globeGeometry = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);
        const textureLoader = new THREE.TextureLoader();
        
        // Use a simple earth texture from a reliable source
        const globeTexture = textureLoader.load(
            'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg',
            () => {
                console.log("Earth texture loaded successfully");
                
                // Create the globe with just the color texture
                const globeMaterial = new THREE.MeshPhongMaterial({
                    map: globeTexture,
                    shininess: 15,
                    transparent: true, // Make globe transparent
                    opacity: 0.9,     // Slightly transparent to help with clicks
                });
                
                globe = new THREE.Mesh(globeGeometry, globeMaterial);
                // Set a lower renderOrder for the globe so nodes can be clicked
                globe.renderOrder = 1;
                scene.add(globe);
                
                // Continue with the rest of the loading process
                addAtmosphereAndGrid();
                updateLoadingProgress(3, 3);
            },
            undefined,
            (error) => {
                console.error("Failed to load simple earth texture:", error);
                createSimplifiedGlobe();
            }
        );
    }
    
    // Add atmosphere and grid elements to the globe
    function addAtmosphereAndGrid() {
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
            side: THREE.BackSide,
            transparent: true,
            depthWrite: false  // Prevent depth writing to allow clicking through
        });
        const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
        atmosphere.renderOrder = 0; // Lowest render order
        scene.add(atmosphere);
        
        // Add grid lines
        const gridGeometry = new THREE.SphereGeometry(GLOBE_RADIUS + 0.2, 36, 18);
        const gridMaterial = new THREE.MeshBasicMaterial({
            color: 0x00e5ff,
            transparent: true,
            opacity: 0.1,
            wireframe: true,
            depthWrite: false  // Prevent depth writing to allow clicking through
        });
        const grid = new THREE.Mesh(gridGeometry, gridMaterial);
        grid.renderOrder = 2; // Low render order
        scene.add(grid);
    }

    // Create a simplified globe without external textures as a fallback
    function createSimplifiedGlobe() {
        // If globe already exists, remove it to avoid duplicates
        if (globe) {
            scene.remove(globe);
        }
        
        console.log("Creating simplified globe as fallback");
        
        const globeGeometry = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);
        
        // Create material with procedural colors instead of textures
        const globeMaterial = new THREE.MeshPhongMaterial({
            color: 0x2233aa,  // Blue base color
            emissive: 0x112244,
            specular: 0x333333,
            shininess: 25,
            transparent: true,
            opacity: 0.9,
            depthWrite: true
        });
        
        globe = new THREE.Mesh(globeGeometry, globeMaterial);
        
        // Ensure the globe is at the center of the scene
        globe.position.set(0, 0, 0);
        globe.renderOrder = 1;
        
        // Make sure the globe is visible
        globe.visible = true;
        
        // Add the globe to the scene
        scene.add(globe);
        
        // Add atmosphere and grid
        addAtmosphereAndGrid();
        
        // Add a wireframe overlay to provide some geographical reference
        const wireframeGeometry = new THREE.SphereGeometry(GLOBE_RADIUS * 1.001, 36, 36);
        const wireframeMaterial = new THREE.MeshBasicMaterial({
            color: 0x00e5ff,
            wireframe: true,
            transparent: true,
            opacity: 0.2,
            depthWrite: false
        });
        
        const wireframe = new THREE.Mesh(wireframeGeometry, wireframeMaterial);
        wireframe.renderOrder = 2;
        scene.add(wireframe);
        
        // Continue with the rest of the loading process
        updateLoadingProgress(3, 3);
    }
    
    // Add specific click hitbox objects for better click detection
    function createClickHitboxes() {
        // This function adds additional invisible hitbox spheres around each node
        // to make them easier to click
        countryNodes.forEach((country, index) => {
            if (nodes[index]) {
                const position = nodes[index].position.clone();
                const hitboxGeometry = new THREE.SphereGeometry(NODE_RADIUS * 4, 8, 8);
                const hitboxMaterial = new THREE.MeshBasicMaterial({
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.0,  // Completely invisible
                    depthWrite: false
                });
                
                const hitbox = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
                hitbox.position.copy(position);
                hitbox.renderOrder = 200; // Highest render order
                hitbox.userData = nodes[index].userData; // Copy userData from original node
                
                scene.add(hitbox);
                // Add hitbox to nodes array so it's included in raycaster checks
                nodes.push(hitbox);
            }
        });
        
        console.log("Created larger hitboxes for better click detection");
    }
    
    // Update loading progress
    function updateLoadingProgress(current, total) {
        const progressFill = document.querySelector('.progress-fill');
        const loadingText = document.querySelector('.loading-text');
        const progress = current / total;
        
        if (progressFill) {
            progressFill.style.width = `${progress * 100}%`;
            loadingText.textContent = `Loading world data... ${Math.round(progress * 100)}%`;
        }
        
        // If loading complete, reveal the globe
        if (current >= total) {
            setTimeout(() => {
                revealGlobe();
            }, 500);
        }
    }

    // Reveal globe with animation
    function revealGlobe() {
        // Fade out loading screen
        const loadingScreen = document.querySelector('.loading-screen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            
            // Ensure globe exists and is set to a very small scale initially
            if (globe) {
                console.log("Revealing globe with animation");
                globe.scale.set(0.01, 0.01, 0.01);
                
                // Position camera further back for better zoom effect
                camera.position.z = 500;
                
                // Zoom in animation
                gsap.to(globe.scale, {
                    x: 1,
                    y: 1,
                    z: 1,
                    duration: 2.5,
                    ease: "power2.out"
                });
                
                gsap.to(camera.position, {
                    z: 250,
                    duration: 2.5,
                    ease: "power2.out",
                    onComplete: () => {
                        // Start auto rotation after loading
                        controls.autoRotate = true;
                        gameState.isAutoRotating = true;
                        
                        // Remove loading screen from DOM
                        setTimeout(() => {
                            loadingScreen.remove();
                        }, 1000);
                    }
                });
            } else {
                console.error("Globe not available for animation - creating emergency globe");
                
                // Emergency fallback - create a very basic globe if all else fails
                const emergencyGeometry = new THREE.SphereGeometry(GLOBE_RADIUS, 32, 32);
                const emergencyMaterial = new THREE.MeshBasicMaterial({
                    color: 0x3366cc,
                    wireframe: false
                });
                
                globe = new THREE.Mesh(emergencyGeometry, emergencyMaterial);
                scene.add(globe);
                
                // Start auto rotation after loading
                controls.autoRotate = true;
                gameState.isAutoRotating = true;
                
                // Remove loading screen
                loadingScreen.remove();
            }
        }
    }

    // Simulate loading process to show progress bar
    function simulateLoading() {
        // Start with a small progress
        const progressFill = document.querySelector('.progress-fill');
        const loadingText = document.querySelector('.loading-text');
        
        if (progressFill && loadingText) {
            progressFill.style.width = "5%";
            loadingText.textContent = "Loading world data... 5%";
        }
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
                opacity: 0.3,
                depthWrite: false
            });
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            glow.position.copy(position);
            glow.renderOrder = 5; // Lower render order
            scene.add(glow);
            
            // Create node with LARGER radius for easier clicking
            const nodeGeometry = new THREE.SphereGeometry(NODE_RADIUS * 1.5, 16, 16);
            const nodeMaterial = new THREE.MeshBasicMaterial({ 
                color: country.color,
                depthWrite: true
            });
            const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
            node.position.copy(position);
            node.renderOrder = 100; // High render order
            node.userData = {
                id: country.id,
                name: country.name,
                lat: country.lat,
                lng: country.lng,
                info: country.info,
                selected: false,
                originalColor: country.color,
                glow: glow
            };
            scene.add(node);
            nodes.push(node);
            
            // Create selection ring (initially hidden)
            const ringGeometry = new THREE.RingGeometry(NODE_RADIUS + 1, NODE_RADIUS + 2, 32);
            const ringMaterial = new THREE.MeshBasicMaterial({ 
                color: SELECTED_COLOR,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.8,
                visible: false,
                depthWrite: false
            });
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.position.copy(position);
            ring.renderOrder = 90; // Higher than globe but lower than nodes
            
            // Orient ring to face camera
            const lookAt = position.clone().multiplyScalar(2);
            ring.lookAt(lookAt);
            
            scene.add(ring);
            rings.push({
                mesh: ring,
                nodeId: country.id
            });
            
            // Create pulsing animation for glow
            animateGlow(glow);
        });
    }

    // Initialize path line for drawing
    function initPathLine() {
        const geometry = new THREE.BufferGeometry();
        const material = new THREE.LineBasicMaterial({
            color: LINE_COLOR,
            linewidth: 2
        });
        
        activePathLine = new THREE.Line(geometry, material);
        scene.add(activePathLine);
    }
    
    // Update the active path line
    function updatePathLine() {
        if (gameState.selectedCountries.length < 2) return;
        
        const positions = [];
        gameState.selectedCountries.forEach(country => {
            positions.push(country.position);
        });
        
        const curve = new THREE.CatmullRomCurve3(positions);
        const points = curve.getPoints(50 * (positions.length - 1));
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        activePathLine.geometry.dispose();
        activePathLine.geometry = geometry;
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
            // Scale back the glow effect
            gsap.to(gameState.hoveredCountry.userData.glow.scale, {
                x: 1, y: 1, z: 1,
                duration: 0.3
            });
            gameState.hoveredCountry = null;
            countryTooltip.style.opacity = "0";
        }
        
        // Handle new hover
        if (intersects.length > 0) {
            const hoveredNode = intersects[0].object;
            if (!hoveredNode.userData.selected) {
                hoveredNode.material.color.setHex(HOVER_COLOR);
            }
            
            // Enhance glow effect on hover
            gsap.to(hoveredNode.userData.glow.scale, {
                x: 1.8, y: 1.8, z: 1.8,
                duration: 0.3
            });
            
            gameState.hoveredCountry = hoveredNode;
            
            // Update tooltip with enhanced information
            const countryData = countryNodes.find(c => c.id === hoveredNode.userData.id);
            countryTooltip.innerHTML = `
                <strong>${hoveredNode.userData.name}</strong>
                <div>${hoveredNode.userData.info}</div>
                <div>Lat: ${countryData.lat.toFixed(2)}, Long: ${countryData.lng.toFixed(2)}</div>
            `;
            countryTooltip.style.opacity = "1";
            
            // Temporarily pause auto-rotation when hovering over a node
            if (gameState.isAutoRotating) {
                controls.autoRotate = false;
            }
        } else {
            // Resume auto-rotation if we're not hovering over a node and not dragging
            if (gameState.isAutoRotating && !gameState.isDragging) {
                controls.autoRotate = true;
            }
        }
    }

    // Handle mouse click - fixed version
    function onMouseClick(event) {
        if (gameState.isComplete) return;
        
        // Calculate mouse position again to ensure accuracy
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        console.log("Click detected at:", mouse.x, mouse.y);
        
        // Stop auto-rotation on click
        controls.autoRotate = false;
        
        // Set raycaster with larger threshold for easier clicking
        raycaster.params.Points.threshold = 5;
        raycaster.setFromCamera(mouse, camera);
        
        // Log all objects in the scene for debugging
        console.log("Total nodes in scene:", nodes.length);
        
        // Get intersections with nodes
        const intersects = raycaster.intersectObjects(nodes);
        console.log("Intersections found:", intersects.length);
        
        if (intersects.length > 0) {
            const clickedNode = intersects[0].object;
            const nodeId = clickedNode.userData.id;
            
            console.log("Node clicked:", clickedNode.userData.name);
            
            // Check if node is already selected
            if (gameState.path.includes(nodeId)) {
                console.log("Node already in path, skipping");
                return;
            }
            
            // Select node
            selectNode(clickedNode);
            
            // Rotate globe to center on selected node
            rotateGlobeToNode(clickedNode);
            
            // Update path
            updatePath();
            
            // Update the active path line
            updatePathLine();
            
            // Play sound effect
            playSelectSound();
            
            // Resume auto-rotation after a delay if enabled
            if (gameState.isAutoRotating) {
                setTimeout(() => {
                    if (!gameState.isDragging) {
                        controls.autoRotate = true;
                    }
                }, 5000); // Resume after 5 seconds
            }
        } else {
            console.log("No node was clicked");
        }
    }

    // Select a node
    function selectNode(node) {
        // Mark node as selected
        node.userData.selected = true;
        node.material.color.setHex(SELECTED_COLOR);
        
        // Find the original node if this is a hitbox
        const originalNodeIndex = nodes.findIndex(n => 
            n.userData.id === node.userData.id && 
            n.geometry.type === "SphereGeometry" && 
            n.geometry.parameters.radius === NODE_RADIUS * 1.5
        );
        
        const nodeToUse = originalNodeIndex !== -1 ? nodes[originalNodeIndex] : node;
        
        // Add node to selected list
        gameState.selectedCountries.push({
            id: nodeToUse.userData.id,
            name: nodeToUse.userData.name,
            position: nodeToUse.position.clone(),
            lat: countryNodes.find(n => n.id === nodeToUse.userData.id).lat,
            lng: countryNodes.find(n => n.id === nodeToUse.userData.id).lng
        });
        
        // Add node ID to path
        gameState.path.push(nodeToUse.userData.id);
        
        // If this is not the first node, add a line to previous node
        if (gameState.selectedCountries.length > 1) {
            addLine(
                gameState.selectedCountries[gameState.selectedCountries.length - 2].position,
                gameState.selectedCountries[gameState.selectedCountries.length - 1].position
            );
            
            // Calculate distance
            calculateDistance();
        }
        
        // Show and animate the selection ring
        const ring = rings.find(r => r.nodeId === nodeToUse.userData.id);
        if (ring) {
            ring.mesh.material.visible = true;
            // Animate the selection ring
            gsap.to(ring.mesh.scale, {
                x: 1.5, y: 1.5, z: 1.5,
                duration: 0.5,
                repeat: 1,
                yoyo: true,
                onComplete: () => {
                    ring.mesh.scale.set(1, 1, 1);
                }
            });
        }
        
        // Scale up the node itself
        gsap.to(nodeToUse.scale, {
            x: 1.5, y: 1.5, z: 1.5,
            duration: 0.3,
            ease: "back.out"
        });
        
        // Update UI with animated counters
        updateUI(true);
    }

    // Add line between nodes with animated drawing
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
       
       const curvePoints = new THREE.CatmullRomCurve3(points).getPoints(50);
       const geometry = new THREE.BufferGeometry().setFromPoints(curvePoints);
       const line = new THREE.Line(geometry, material);
       line.renderOrder = 50; // Between globe and nodes
       
       // Animate the line drawing
       const initialPoints = [startPos];
       const initialGeometry = new THREE.BufferGeometry().setFromPoints(initialPoints);
       line.geometry = initialGeometry;
       
       scene.add(line);
       lines.push(line);
       
       // Animate line drawing
       let step = 0;
       const totalSteps = curvePoints.length;
       const lineDrawingInterval = setInterval(() => {
           step++;
           if (step >= totalSteps) {
               clearInterval(lineDrawingInterval);
               return;
           }
           
           const visiblePoints = curvePoints.slice(0, step + 1);
           const updatedGeometry = new THREE.BufferGeometry().setFromPoints(visiblePoints);
           line.geometry.dispose();
           line.geometry = updatedGeometry;
       }, 20);
   }

   // Calculate distance between nodes
   function calculateDistance() {
       const lastIdx = gameState.selectedCountries.length - 1;
       const start = gameState.selectedCountries[lastIdx - 1];
       const end = gameState.selectedCountries[lastIdx];
       
       // Use Haversine formula to calculate distance
       const distance = calculateHaversineDistance(
           start.lat,
           start.lng,
           end.lat,
           end.lng
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

   // Update UI with optional animation
   function updateUI(animate = false) {
       // Update path display
       if (gameState.path.length === 0) {
           pathSequence.textContent = "Start your journey";
       } else {
           pathSequence.textContent = gameState.path.join(" → ");
       }
       
       // Update stats with optional animation
       if (animate) {
           // Animate distance counter
           const prevDistance = parseFloat(totalDistance.textContent) || 0;
           const distanceValue = Math.round(gameState.totalDistance);
           animateCounter(totalDistance, prevDistance, distanceValue, ' km');
           
           // Animate energy counter
           const prevEnergy = parseFloat(totalEnergy.textContent) || 0;
           animateCounter(totalEnergy, prevEnergy, gameState.energyUsed, ' units');
           
           // Animate countries counter
           const prevCountries = parseInt(countriesVisited.textContent) || 0;
           animateCounter(countriesVisited, prevCountries, gameState.selectedCountries.length, '');
       } else {
           // Just update without animation
           totalDistance.textContent = `${Math.round(gameState.totalDistance)} km`;
           totalEnergy.textContent = `${gameState.energyUsed} units`;
           countriesVisited.textContent = gameState.selectedCountries.length;
       }
   }

   // Animate counter from start to end value
   function animateCounter(element, start, end, suffix) {
       const duration = 1; // seconds
       const fps = 60;
       const frames = duration * fps;
       const increment = (end - start) / frames;
       let current = start;
       let frame = 0;
       
       const counterInterval = setInterval(() => {
           frame++;
           current += increment;
           
           if (frame >= frames) {
               clearInterval(counterInterval);
               current = end;
           }
           
           element.textContent = `${Math.round(current)}${suffix}`;
       }, 1000 / fps);
   }

   // Update path display
   function updatePath() {
       if (gameState.path.length === 0) {
           pathSequence.textContent = "Start your journey";
       } else {
           pathSequence.textContent = gameState.path.join(" → ");
       }
   }

   // Rotate globe to center on a node with smooth animation
   function rotateGlobeToNode(node) {
       const position = node.position.clone();
       
       // Calculate target quaternion for smooth rotation
       const targetQuaternion = new THREE.Quaternion();
       const up = new THREE.Vector3(0, 1, 0);
       const lookAtMatrix = new THREE.Matrix4();
       lookAtMatrix.lookAt(new THREE.Vector3(0, 0, 0), position.negate(), up);
       targetQuaternion.setFromRotationMatrix(lookAtMatrix);
       
       // Animate camera to position
       gsap.to(controls.target, {
           x: position.x * 0.1,
           y: position.y * 0.1,
           z: position.z * 0.1,
           duration: 1.5,
           ease: "power2.out",
           onUpdate: () => controls.update()
       });
       
       // Make sure auto-rotation is paused during this animation
       controls.autoRotate = false;
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
           lastNode.lat,
           lastNode.lng,
           firstNode.lat,
           firstNode.lng
       );
       
       gameState.totalDistance += finalDistance;
       gameState.energyUsed += Math.round(finalDistance / 100);
       
       // Add first node to path again
       gameState.path.push(firstNode.id);
       
       // Update UI
       updateUI(true);
       
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
           if (node.userData && node.userData.selected !== undefined) {
               node.userData.selected = false;
               node.material.color.setHex(node.userData.originalColor || DEFAULT_COLOR);
               node.scale.set(1, 1, 1);
           }
       });
       
       // Hide all selection rings
       rings.forEach(ring => {
           ring.mesh.material.visible = false;
       });
       
       // Remove lines
       lines.forEach(line => {
           scene.remove(line);
       });
       lines = [];
       
       // Reset active path line
       activePathLine.geometry.dispose();
       activePathLine.geometry = new THREE.BufferGeometry();
       
       // Resume auto-rotation if it was enabled
       if (gameState.isAutoRotating) {
           controls.autoRotate = true;
       }
       
       // Hide completion modal if visible
       completionModal.classList.remove('active');
   }

   // Show completion modal
   function showCompletionModal() {
       resultDistance.textContent = `${Math.round(gameState.totalDistance)} km`;
       resultEnergy.textContent = gameState.energyUsed;
       resultCountries.textContent = gameState.selectedCountries.length;
       resultPath.textContent = gameState.path.join(" → ");
       
       // Show modal with animation
       gsap.to(completionModal, {
           opacity: 1,
           duration: 0.5,
           onStart: () => {
               completionModal.classList.add('active');
           }
       });
   }

   // Optimize route using nearest neighbor algorithm
   function optimizeRoute() {
       if (gameState.selectedCountries.length < 2) {
           alert("Please select at least 2 countries before optimizing");
           return;
       }
       
       resetGame();
       
       // Start with first node
       const startNode = nodes.find(node => node.userData && node.userData.id === 1);
       if (!startNode) {
           console.error("Cannot find start node for optimization");
           return;
       }
       
       selectNode(startNode);
       
       // Use nearest neighbor algorithm
       let currentNode = startNode;
       let remainingNodes = nodes.filter(node => 
           node.userData && 
           node.userData.id && 
           node.userData.id !== startNode.userData.id &&
           // Only include actual nodes, not hitboxes
           node.geometry.type === "SphereGeometry" && 
           node.geometry.parameters.radius === NODE_RADIUS * 1.5
       );
       
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
           
           if (nearestNode) {
               // Select nearest node
               selectNode(nearestNode);
               rotateGlobeToNode(nearestNode);
               
               // Update current node and remaining nodes
               currentNode = nearestNode;
               remainingNodes = remainingNodes.filter(node => node !== nearestNode);
           } else {
               console.error("Cannot find nearest node");
               break;
           }
       }
       
       // Complete route back to start
       completeRoute();
   }

   // Play sound effect when selecting node - using shared AudioContext
   function playSelectSound() {
       // Skip if AudioContext couldn't be created
       if (!audioContext) return;
       
       try {
           const oscillator = audioContext.createOscillator();
           const gainNode = audioContext.createGain();
           
           oscillator.connect(gainNode);
           gainNode.connect(audioContext.destination);
           
           oscillator.type = 'sine';
           oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
           gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
           
           oscillator.start();
           
           // Add frequency modulation for more interesting sound
           oscillator.frequency.exponentialRampToValueAtTime(
               880, 
               audioContext.currentTime + 0.1
           );
           
           // Add fade out
           gainNode.gain.exponentialRampToValueAtTime(
               0.001,
               audioContext.currentTime + 0.3
           );
           
           oscillator.stop(audioContext.currentTime + 0.3);
       } catch (error) {
           console.error("Error playing sound:", error);
       }
   }

   // Animation loop
   function animate() {
       requestAnimationFrame(animate);
       
       // Update controls
       controls.update();
       
       // Rotate all visible selection rings to face the camera
       rings.forEach(ring => {
           if (ring.mesh.material.visible) {
               ring.mesh.lookAt(camera.position);
           }
       });
       
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

   // Add auto-rotation toggle button
   const autoRotateBtn = document.createElement('button');
   autoRotateBtn.className = 'glow-button';
   autoRotateBtn.textContent = 'AUTO ROTATE';
   autoRotateBtn.style.marginRight = '10px';
   document.querySelector('.control-panel').prepend(autoRotateBtn);

   autoRotateBtn.addEventListener('click', () => {
       gameState.isAutoRotating = !gameState.isAutoRotating;
       controls.autoRotate = gameState.isAutoRotating;
       autoRotateBtn.textContent = gameState.isAutoRotating ? 'STOP ROTATION' : 'AUTO ROTATE';
   });
});
