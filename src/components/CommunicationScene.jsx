import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function CommunicationScene() {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // ── Renderer ──────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // ── Scene & Camera ────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 1.5, 6);
    camera.lookAt(0, 0, 0);

    // ── Lighting ──────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(4, 8, 6);
    scene.add(dirLight);

    // ── Helper: build an ESP32-style board ────────────────────────────────────
    function makeBoard(x) {
      const group = new THREE.Group();

      // PCB base
      const pcb = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.07, 2.2),
        new THREE.MeshStandardMaterial({ color: 0x1a5c2e, roughness: 0.6, metalness: 0.1 })
      );
      group.add(pcb);

      // Main chip
      const chip = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.12, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.3, metalness: 0.6 })
      );
      chip.position.set(0, 0.09, 0);
      group.add(chip);

      // Small components
      const smallMat = new THREE.MeshStandardMaterial({ color: 0x333355, roughness: 0.4 });
      [-0.3, 0.3].forEach((z) => {
        const comp = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.08, 0.15), smallMat);
        comp.position.set(0.4, 0.08, z);
        group.add(comp);
      });

      // Pin headers (left and right sides)
      const pinMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.1 });
      for (let i = 0; i < 7; i++) {
        const pin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.15, 0.05), pinMat);
        pin.position.set(-0.75, 0.04, -0.9 + i * 0.3);
        group.add(pin);
        const pin2 = pin.clone();
        pin2.position.x = 0.75;
        group.add(pin2);
      }

      // Antenna
      const antennaMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.1 });
      const antenna = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.7, 0.06), antennaMat);
      antenna.position.set(0, 0.4, -1.05);
      group.add(antenna);

      // Glow LED dot
      const led = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 2 })
      );
      led.position.set(-0.3, 0.12, 0.8);
      group.add(led);

      group.position.set(x, 0, 0);
      return group;
    }

    const sensorBoard   = makeBoard(-2.2);
    const receiverBoard = makeBoard( 2.2);

    // Label them
    sensorBoard.userData.label   = "Sensor";
    receiverBoard.userData.label = "Receiver";

    const boardGroup = new THREE.Group();
    boardGroup.add(sensorBoard, receiverBoard);
    scene.add(boardGroup);

    // ── Curved wireless link (CatmullRom) ─────────────────────────────────────
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.2, 0.5, 0),
      new THREE.Vector3(-1.1, 1.4, 0),
      new THREE.Vector3(   0, 1.8, 0),
      new THREE.Vector3( 1.1, 1.4, 0),
      new THREE.Vector3( 2.2, 0.5, 0),
    ]);

    const linePoints = curve.getPoints(60);
    const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x22c55e, linewidth: 2, transparent: true, opacity: 0.7 });
    const wireLine = new THREE.Line(lineGeo, lineMat);
    boardGroup.add(wireLine);

    // ── Packet sphere (animates along the curve) ──────────────────────────────
    const packet = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 16, 16),
      new THREE.MeshStandardMaterial({
        color: 0x4ade80,
        emissive: 0x4ade80,
        emissiveIntensity: 1.5,
        transparent: true,
        opacity: 0.9,
      })
    );
    boardGroup.add(packet);

    let t = 0; // 0 → 1 along curve

    // ── Grid floor ────────────────────────────────────────────────────────────
    const grid = new THREE.GridHelper(10, 20, 0xe5e7eb, 0xe5e7eb);
    grid.position.y = -1.15;
    grid.material.transparent = true;
    grid.material.opacity = 0.4;
    scene.add(grid);

    // ── Animation loop ────────────────────────────────────────────────────────
    let animId;
    const clock = new THREE.Clock();

    function animate() {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Packet travel
      t = (t + 0.004) % 1;
      const pt = curve.getPoint(t);
      packet.position.copy(pt);
      packet.material.emissiveIntensity = 1.2 + Math.sin(elapsed * 6) * 0.4;

      // Gentle group rotation
      boardGroup.rotation.y = Math.sin(elapsed * 0.3) * 0.18;

      // Link line pulse
      lineMat.opacity = 0.5 + Math.sin(elapsed * 2) * 0.2;

      renderer.render(scene, camera);
    }
    animate();

    // ── Resize handler ────────────────────────────────────────────────────────
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} style={{ width: "100%", height: "320px" }} />;
}
