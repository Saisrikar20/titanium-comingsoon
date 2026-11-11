(() => {
  "use strict";

  const canvas = document.getElementById("spacemanCanvas");
  if (!canvas || typeof THREE === "undefined" || typeof THREE.GLTFLoader === "undefined") {
    console.warn("Spaceman canvas or THREE.GLTFLoader not available");
    return;
  }

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    42,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 0, 7.5);
  window.__spacemanCamera = camera;

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;

  // Rebalanced, filmic lighting to eliminate brightness clipping
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.85;

  const ambientLight = new THREE.AmbientLight(0x88aacc, 0.55);
  scene.add(ambientLight);

  // Key light: warm sun (softened to prevent overexposure)
  const sunLight = new THREE.DirectionalLight(0xfffaee, 1.1);
  sunLight.position.set(4, 5, 5);
  scene.add(sunLight);

  // Soft cyan rim light from Earth
  const rimLight = new THREE.DirectionalLight(0x6ad8ff, 1.15);
  rimLight.position.set(-5, -2, 3);
  scene.add(rimLight);

  // Backlight: deep violet
  const backLight = new THREE.DirectionalLight(0x9a46ff, 0.7);
  backLight.position.set(0, 3, -5);
  scene.add(backLight);

  // Spaceman hierarchy:
  // Starts IN THE CENTER as requested!
  const spacemanRoot = new THREE.Group();
  const spacemanFloat = new THREE.Group();
  spacemanRoot.add(spacemanFloat);
  scene.add(spacemanRoot);

  let spacemanModel = null;
  let isLoaded = false;
  let isDone = false;

  // Rigged Bones for Waving & Gestures & Swimming
  let bones = {
    rightShoulder: null,
    rightArm: null,
    rightForeArm: null,
    rightHand: null,
    leftArm: null,
    leftForeArm: null,
    leftHand: null,
    leftUpLeg: null,
    leftLeg: null,
    leftFoot: null,
    rightUpLeg: null,
    rightLeg: null,
    rightFoot: null,
    hips: null,
    head: null,
    spine: null
  };

  const initialRotations = {};

  function updateLayout() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  // Load Rigged Astronaut Model
  const gltfLoader = new THREE.GLTFLoader();
  gltfLoader.load(
    "assets/astronaut.glb",
    (gltf) => {
      const model = gltf.scene;

      // Model height calibration (~2.5 units tall in center view)
      model.scale.setScalar(1.35);
      model.position.set(0, -1.35, 0);

      // Initial orientation: facing forward toward viewer
      model.rotation.y = 0.05;
      model.rotation.x = 0.0;

      // Traverse bones & soften materials
      model.traverse((child) => {
        if (child.isBone) {
          const name = child.name;
          if (name === "RightShoulder") bones.rightShoulder = child;
          if (name === "RightArm") bones.rightArm = child;
          if (name === "RightForeArm") bones.rightForeArm = child;
          if (name === "RightHand") bones.rightHand = child;
          if (name === "LeftArm") bones.leftArm = child;
          if (name === "LeftForeArm") bones.leftForeArm = child;
          if (name === "LeftHand") bones.leftHand = child;
          if (name === "LeftUpLeg") bones.leftUpLeg = child;
          if (name === "LeftLeg") bones.leftLeg = child;
          if (name === "LeftFoot") bones.leftFoot = child;
          if (name === "RightUpLeg") bones.rightUpLeg = child;
          if (name === "RightLeg") bones.rightLeg = child;
          if (name === "RightFoot") bones.rightFoot = child;
          if (name === "Hips") bones.hips = child;
          if (name === "Head") bones.head = child;
          if (name === "Spine" || name === "Spine01") bones.spine = child;

          initialRotations[name] = child.rotation.clone();
        }
        if (child.isMesh) {
          child.frustumCulled = false;
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            child.material.metalness = 0.25;
            child.material.roughness = 0.45;
          }
        }
      });

      spacemanModel = model;
      spacemanFloat.add(model);
      isLoaded = true;
      tStart = performance.now();
      window.__spacemanLoaded = true;
      window.__spacemanTStart = tStart;
      if (window.__syncMainStart) window.__syncMainStart();

      window.__spacemanBones = bones;
      window.__initialRotations = initialRotations;
      window.__spacemanModel = model;
      window.__spacemanFloat = spacemanFloat;
      window.__spacemanRoot = spacemanRoot;
      window.__spacemanCamera = camera;
      window.__spacemanScene = scene;
      window.__spacemanRenderer = renderer;

      updateLayout();
      canvas.style.opacity = "1";
    },
    undefined,
    (err) => {
      console.error("Error loading astronaut GLB:", err);
    }
  );

  // Mouse cursor tracking
  const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
  window.addEventListener("pointermove", (e) => {
    mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
  });

  window.addEventListener("resize", updateLayout);

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

  // Animation timeline start
  let tStart = performance.now();

  function animate() {
    if (isDone) return;
    requestAnimationFrame(animate);

    const now = performance.now();
    const elapsed = (now - tStart) / 1000;
    const time = elapsed;
    window.__spacemanElapsed = elapsed;

    // Mouse inertia
    mouse.x += (mouse.targetX - mouse.x) * 0.05;
    mouse.y += (mouse.targetY - mouse.y) * 0.05;

    if (isLoaded && spacemanModel) {
      /* ============================================================
         CHOREOGRAPHY STAGES:
         0.0s – 2.0s : Full-body greeting, palm actively waves LEFT and RIGHT
         2.0s – 4.4s : Turns 180°, hands return to normal,
                       grows bigger zooming tight into back of head
         4.4s – 4.9s : Camera pushes through helmet visor & model dissolves
         4.8s+       : Game AR Visor / Cockpit view opens looking at galaxy
         ============================================================ */

      if (window.__swimTestPose) {
        window.__swimTestPose(bones, initialRotations, time);
      } else if (elapsed <= 2.0) {
        // --- STAGE 1: Full-body greeting with palm actively waving LEFT and RIGHT ---
        camera.position.set(0, 0, 7.5);
        spacemanRoot.position.set(0, -0.3, 0);
        spacemanFloat.scale.setScalar(1.0);
        spacemanModel.rotation.y = 0.05;
        spacemanModel.rotation.x = 0.0;

        // Dynamic wave oscillation: ONLY the palm/wrist moves side-to-side (hand/arm stays steady)
        const wave = Math.sin(time * 7.5); // rapid human waving tempo
        const waveHand = wave * 0.52;       // ±30 degrees palm wave left/right

        // Lift arm up and outward away from body - stationary
        if (bones.leftArm && initialRotations["LeftArm"]) {
          const init = initialRotations["LeftArm"];
          bones.leftArm.rotation.set(init.x + 1.0, init.y, init.z - 0.3);
        }

        // Bend forearm upright to raise hand high - held completely steady (no arm sway)
        if (bones.leftForeArm && initialRotations["LeftForeArm"]) {
          const init = initialRotations["LeftForeArm"];
          bones.leftForeArm.rotation.set(init.x, init.y + 0.5, init.z + 1.5);
        }

        // ONLY the palm is actively waving LEFT and RIGHT facing the screen
        if (bones.leftHand && initialRotations["LeftHand"]) {
          const init = initialRotations["LeftHand"];
          bones.leftHand.rotation.set(init.x + 0.5, init.y - 1.54, init.z + 0.2 + waveHand);
        }

        // Right arm rests naturally in zero-g
        if (bones.rightArm && initialRotations["RightArm"]) {
          const init = initialRotations["RightArm"];
          bones.rightArm.rotation.set(init.x, init.y, init.z);
        }
        if (bones.rightForeArm && initialRotations["RightForeArm"]) {
          const init = initialRotations["RightForeArm"];
          bones.rightForeArm.rotation.set(init.x, init.y, init.z);
        }
        if (bones.rightHand && initialRotations["RightHand"]) {
          const init = initialRotations["RightHand"];
          bones.rightHand.rotation.set(init.x, init.y, init.z);
        }

        // Legs have slight microgravity relaxation
        if (bones.leftLeg && initialRotations["LeftLeg"]) {
          const init = initialRotations["LeftLeg"];
          bones.leftLeg.rotation.set(init.x - 0.05, init.y, init.z);
        }
        if (bones.rightLeg && initialRotations["RightLeg"]) {
          const init = initialRotations["RightLeg"];
          bones.rightLeg.rotation.set(init.x - 0.05, init.y, init.z);
        }

        // Natural responsive head nod & gaze toward user cursor
        if (bones.head && initialRotations["Head"]) {
          const init = initialRotations["Head"];
          bones.head.rotation.y = init.y + mouse.x * 0.25;
          bones.head.rotation.x = init.x + 0.04 + mouse.y * 0.18;
        }

        // Gentle zero-g floating
        spacemanFloat.position.y = Math.sin(time * 1.3) * 0.08;
        spacemanFloat.position.x = Math.cos(time * 0.9) * 0.04;
        spacemanFloat.rotation.z = Math.sin(time * 0.8) * 0.03;

      } else if (elapsed <= 4.4) {
        // --- STAGE 2: Turn around 180°, keeping legs as anchor point, bend forward 45°, camera focused on head ---
        const p = easeInOut(clamp((elapsed - 2.0) / 2.4));

        spacemanModel.rotation.order = "YXZ";
        // Smoothly turn around 180 degrees from 0.05 to PI (facing into depth)
        spacemanModel.rotation.y = lerp(0.05, Math.PI, p);
        // BEND FORWARD 45 DEGREES (pitch forward into space, legs anchored below)
        spacemanModel.rotation.x = lerp(0.0, -Math.PI / 4, p);

        // Keep legs as pivot point while centering focus onto the HEAD / HELMET
        spacemanRoot.position.y = lerp(-0.3, -0.2, p);
        spacemanRoot.position.z = lerp(0.0, 0.5, p);
        spacemanFloat.scale.setScalar(lerp(1.0, 1.7, p));

        // Camera stays locked in standard view looking directly at the helmet dome
        camera.position.set(0, 0, 7.5);
        camera.lookAt(0, 0, 0);

        // Hands go smoothly back to normal resting posture along sides as he turns
        if (bones.leftArm && initialRotations["LeftArm"]) {
          const init = initialRotations["LeftArm"];
          bones.leftArm.rotation.set(
            lerp(init.x + 1.0, init.x + 0.2, p),
            init.y,
            lerp(init.z - 0.3, init.z - 0.1, p)
          );
        }
        if (bones.leftForeArm && initialRotations["LeftForeArm"]) {
          const init = initialRotations["LeftForeArm"];
          bones.leftForeArm.rotation.set(
            init.x,
            lerp(init.y + 0.5, init.y, p),
            lerp(init.z + 1.5, init.z, p)
          );
        }
        if (bones.leftHand && initialRotations["LeftHand"]) {
          const init = initialRotations["LeftHand"];
          bones.leftHand.rotation.set(
            lerp(init.x + 0.5, init.x, p),
            lerp(init.y - 1.54, init.y, p),
            lerp(init.z + 0.2, init.z, p)
          );
        }

        // Right arm rests naturally along side
        if (bones.rightArm && initialRotations["RightArm"]) {
          const init = initialRotations["RightArm"];
          bones.rightArm.rotation.set(lerp(init.x, init.x + 0.2, p), init.y, lerp(init.z, init.z + 0.1, p));
        }
        if (bones.rightForeArm && initialRotations["RightForeArm"]) {
          const init = initialRotations["RightForeArm"];
          bones.rightForeArm.rotation.set(init.x, init.y, init.z);
        }
        if (bones.rightHand && initialRotations["RightHand"]) {
          const init = initialRotations["RightHand"];
          bones.rightHand.rotation.set(init.x, init.y, init.z);
        }

        // Legs stay relaxed trailing in microgravity
        if (bones.leftLeg && initialRotations["LeftLeg"]) {
          const init = initialRotations["LeftLeg"];
          bones.leftLeg.rotation.set(init.x - 0.05, init.y, init.z);
        }
        if (bones.rightLeg && initialRotations["RightLeg"]) {
          const init = initialRotations["RightLeg"];
          bones.rightLeg.rotation.set(init.x - 0.05, init.y, init.z);
        }

        // Head looks forward into deep space
        if (bones.head && initialRotations["Head"]) {
          const init = initialRotations["Head"];
          bones.head.rotation.set(lerp(init.x, init.x - 0.4, p), init.y, init.z);
        }

      } else if (elapsed <= 5.4) {
        // --- STAGE 3: Suspended in 45° space dive while HUD shows "WARP DRIVE · ENGAGED" ---
        spacemanModel.rotation.order = "YXZ";
        spacemanModel.rotation.y = Math.PI;
        spacemanModel.rotation.x = -Math.PI / 4; // Held at 45° forward dive

        spacemanRoot.position.set(0, -0.2 + Math.sin(time * 1.5) * 0.02, 0.5);
        spacemanFloat.scale.setScalar(1.7);

        // Camera stays locked in focus on the head
        camera.position.set(0, 0, 7.5);
        camera.lookAt(0, 0, 0);

        if (bones.head && initialRotations["Head"]) {
          const init = initialRotations["Head"];
          bones.head.rotation.set(init.x - 0.4, init.y, init.z);
        }

        spacemanCanvas.style.opacity = "1";

      } else if (elapsed <= 7.0) {
        // --- STAGE 4: WARP ANIMATION - astronaut shoots forward into warp stream & dissolves ---
        const wp = easeIn(clamp((elapsed - 5.4) / 1.4));

        spacemanModel.rotation.order = "YXZ";
        spacemanModel.rotation.y = Math.PI;
        spacemanModel.rotation.x = -Math.PI / 4;

        spacemanRoot.position.z = lerp(0.5, -14.0, wp);
        spacemanRoot.position.y = lerp(-0.2, -0.6, wp);
        spacemanFloat.scale.setScalar(lerp(1.7, 1.2, wp));

        camera.position.set(0, 0, 7.5);
        camera.lookAt(0, 0, 0);

        // Fades out into the hyperspace vortex
        spacemanCanvas.style.opacity = (1 - easeIn(clamp((elapsed - 5.6) / 0.8))).toFixed(3);

      } else {
        // --- STAGE 4: REMOVED & Game AR view active ---
        canvas.style.opacity = "0";
        canvas.style.display = "none";
        isDone = true;
        return;
      }
    }

    renderer.render(scene, camera);
  }

  window.__resetSpaceman = () => {
    tStart = performance.now();
    isDone = false;
    canvas.style.display = "block";
    canvas.style.opacity = "1";
    requestAnimationFrame(animate);
  };

  animate();
})();
