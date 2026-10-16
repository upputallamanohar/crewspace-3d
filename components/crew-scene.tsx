"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import "./crew-scene.css";

type Interaction = {
  x: number; y: number; yaw: number; pitch: number; dragging: boolean;
  startX: number; startY: number; startYaw: number; startPitch: number;
};

/** An actual, locally rendered WebGL sculpture, with a CSS 3D fallback. */
export default function CrewScene({ motion = true }: { motion?: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const motionRef = useRef(motion);
  const interaction = useRef<Interaction>({ x: 0, y: 0, yaw: 0, pitch: 0, dragging: false, startX: 0, startY: 0, startYaw: 0, startPitch: 0 });
  const [renderer, setRenderer] = useState<"fallback" | "webgl">("fallback");

  useEffect(() => { motionRef.current = motion; }, [motion]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    let webgl: THREE.WebGLRenderer;
    try {
      webgl = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    } catch {
      // The self-contained 3D fallback remains visible on devices without WebGL.
      return;
    }
    webgl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    webgl.setClearColor(0x000000, 0);
    webgl.outputColorSpace = THREE.SRGBColorSpace;
    webgl.toneMapping = THREE.ACESFilmicToneMapping;
    webgl.toneMappingExposure = 1.15;
    webgl.shadowMap.enabled = true;
    webgl.shadowMap.type = THREE.PCFShadowMap;
    webgl.domElement.setAttribute("aria-hidden", "true");
    viewport.appendChild(webgl.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 60);
    camera.position.set(0, 0.65, 9.4);
    camera.lookAt(0, -0.04, 0);
    const environment = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(webgl);
    const environmentMap = pmrem.fromScene(environment, 0.05);
    scene.environment = environmentMap.texture;
    environment.dispose();
    pmrem.dispose();
    scene.add(new THREE.HemisphereLight(0xffffff, 0xe3bbaa, 2.4));
    const key = new THREE.DirectionalLight(0xffffff, 4.2);
    key.position.set(-3, 6, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -5;
    key.shadow.camera.right = 5;
    key.shadow.camera.top = 5;
    key.shadow.camera.bottom = -5;
    key.shadow.normalBias = 0.035;
    key.shadow.blurSamples = 6;
    key.shadow.radius = 4;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xc8dcff, 3);
    rim.position.set(4, 2, -4);
    scene.add(rim);

    const world = new THREE.Group();
    world.rotation.set(-0.12, -0.22, -0.1);
    scene.add(world);
    const material = (color: string, metalness = 0.12) => new THREE.MeshPhysicalMaterial({
      color, metalness, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.12, envMapIntensity: 0.7,
    });
    const cobalt = material("#4556fa", 0.18);
    const orange = material("#ff623d");
    const yellow = material("#ffe795");
    const mint = material("#bcebb4");
    const lilac = material("#cdb7ff");
    const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(1.04, 0.37, 180, 30, 2, 3), cobalt);
    knot.rotation.set(0.55, -0.3, 0.1);
    knot.castShadow = true;
    knot.receiveShadow = true;
    world.add(knot);
    const satelliteDefinitions = [
      { geometry: new THREE.SphereGeometry(0.43, 40, 28), surface: orange, position: new THREE.Vector3(-1.92, 1.21, 0.4), phase: 0 },
      { geometry: new THREE.SphereGeometry(0.32, 32, 24), surface: yellow, position: new THREE.Vector3(1.68, 1.48, -0.35), phase: 1.8 },
      { geometry: new RoundedBoxGeometry(0.7, 0.7, 0.7, 4, 0.17), surface: mint, position: new THREE.Vector3(-1.77, -1.15, 0.7), phase: 3.4 },
      { geometry: new THREE.TorusGeometry(0.45, 0.16, 24, 70), surface: orange, position: new THREE.Vector3(1.85, -0.9, 0.55), phase: 4.8 },
      { geometry: new THREE.IcosahedronGeometry(0.23, 1), surface: lilac, position: new THREE.Vector3(-0.1, 2.1, -0.5), phase: 2.7 },
    ];
    const satellites = satelliteDefinitions.map((definition) => {
      const mesh = new THREE.Mesh(definition.geometry, definition.surface);
      mesh.position.copy(definition.position);
      mesh.rotation.set(definition.phase * 0.4, 0.5, -0.35);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      world.add(mesh);
      return { ...definition, mesh };
    });
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.42, 0.013, 12, 150),
      new THREE.MeshStandardMaterial({ color: "#ff9f7b", roughness: 0.38, metalness: 0.16 }),
    );
    ring.rotation.set(0.65, -0.4, -0.4);
    world.add(ring);
    const ringTwo = new THREE.Mesh(
      new THREE.TorusGeometry(2.65, 0.009, 10, 150),
      new THREE.MeshStandardMaterial({ color: "#c6b3ef", roughness: 0.5 }),
    );
    ringTwo.rotation.set(-0.4, 0.7, 0.45);
    world.add(ringTwo);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.ShadowMaterial({ opacity: 0.13 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.55;
    floor.receiveShadow = true;
    scene.add(floor);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = true;
    let frame = 0;
    let previous = 0;
    let time = 0;
    let lost = false;
    let ready = false;
    const resize = () => {
      const width = viewport.clientWidth;
      const height = viewport.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      webgl.setSize(width, height);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(viewport);
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { rootMargin: "100px" });
    intersection.observe(viewport);
    const contextLost = (event: Event) => {
      event.preventDefault();
      lost = true;
      setRenderer("fallback");
    };
    webgl.domElement.addEventListener("webglcontextlost", contextLost);
    resize();
    const render = (timestamp: number) => {
      frame = window.requestAnimationFrame(render);
      const delta = previous ? Math.min((timestamp - previous) / 1000, 0.05) : 0;
      previous = timestamp;
      if (!visible || document.hidden || lost) return;
      const animate = motionRef.current && !reducedMotion.matches;
      if (animate) time += delta;
      const input = interaction.current;
      const smoothing = 1 - Math.exp(-delta * 7);
      world.rotation.y += (input.yaw - 0.22 + input.x * 0.12 - world.rotation.y) * smoothing;
      world.rotation.x += (input.pitch - 0.12 + input.y * 0.09 - world.rotation.x) * smoothing;
      world.position.y = Math.sin(time * 0.9) * 0.09;
      knot.rotation.y = -0.3 + time * 0.19;
      knot.rotation.z = 0.1 + time * 0.09;
      satellites.forEach(({ mesh, position, phase }) => {
        mesh.position.y = position.y + Math.sin(time * 1.3 + phase) * 0.16;
        mesh.position.x = position.x + Math.cos(time * 0.65 + phase) * 0.08;
        mesh.rotation.y = 0.5 + time * (phase > 4 ? -0.35 : 0.24);
        mesh.rotation.z = -0.35 + Math.sin(time * 0.8 + phase) * 0.2;
      });
      ring.rotation.z = -0.4 + time * 0.055;
      ringTwo.rotation.z = 0.45 - time * 0.035;
      webgl.render(scene, camera);
      if (!ready) {
        setRenderer("webgl");
        ready = true;
      }
    };
    webgl.render(scene, camera);
    frame = window.requestAnimationFrame(render);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      intersection.disconnect();
      webgl.domElement.removeEventListener("webglcontextlost", contextLost);
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          geometries.add(object.geometry);
          (Array.isArray(object.material) ? object.material : [object.material]).forEach((surface) => materials.add(surface));
        }
      });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((surface) => surface.dispose());
      key.shadow.dispose();
      environmentMap.dispose();
      webgl.dispose();
      webgl.domElement.remove();
    };
  }, []);

  function updateFallback() {
    const input = interaction.current;
    rootRef.current?.style.setProperty("--cs-turn-x", `${input.pitch * 57.3}deg`);
    rootRef.current?.style.setProperty("--cs-turn-y", `${input.yaw * 57.3}deg`);
  }
  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const input = interaction.current;
    input.dragging = true;
    input.startX = event.clientX;
    input.startY = event.clientY;
    input.startYaw = input.yaw;
    input.startPitch = input.pitch;
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.dataset.dragging = "true";
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const input = interaction.current;
    input.x = (event.clientX - bounds.left) / bounds.width - 0.5;
    input.y = (event.clientY - bounds.top) / bounds.height - 0.5;
    if (input.dragging) {
      input.yaw = input.startYaw + (event.clientX - input.startX) * 0.008;
      input.pitch = Math.max(-0.7, Math.min(0.7, input.startPitch + (event.clientY - input.startY) * 0.005));
      updateFallback();
    }
  }
  function pointerUp(event: PointerEvent<HTMLDivElement>) {
    interaction.current.dragging = false;
    event.currentTarget.dataset.dragging = "false";
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    const input = interaction.current;
    if (event.key === "ArrowLeft") input.yaw -= 0.16;
    else if (event.key === "ArrowRight") input.yaw += 0.16;
    else if (event.key === "ArrowUp") input.pitch = Math.max(-0.7, input.pitch - 0.12);
    else if (event.key === "ArrowDown") input.pitch = Math.min(0.7, input.pitch + 0.12);
    else if (event.key === "Home") { input.yaw = 0; input.pitch = 0; }
    else return;
    event.preventDefault();
    updateFallback();
  }

  return (
    <div
      ref={rootRef} className="crew-scene" data-renderer={renderer} data-motion={motion ? "on" : "off"}
      tabIndex={0} role="img"
      aria-label="Interactive 3D playground: a glossy blue sculpture and colorful floating shapes. Drag or use the arrow keys to rotate. Press Home to reset."
      onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}
      onPointerLeave={() => { interaction.current.x = 0; interaction.current.y = 0; }} onKeyDown={keyDown}
      style={{ "--cs-turn-x": "0deg", "--cs-turn-y": "0deg" } as CSSProperties}
    >
      <div className="cs-color-wash" aria-hidden="true" />
      <div className="cs-ground-shadow" aria-hidden="true" />
      <div className="cs-fallback" aria-hidden="true">
        <div className="cs-fallback-world">
          <div className="cs-fallback-core"><i /><i /><i /></div>
          <div className="cs-fallback-orbit" />
          <div className="cs-fallback-sphere cs-fallback-orange" />
          <div className="cs-fallback-sphere cs-fallback-yellow" />
          <div className="cs-fallback-sphere cs-fallback-mint" />
          <div className="cs-fallback-mini-ring" />
          <div className="cs-fallback-sphere cs-fallback-lilac" />
        </div>
      </div>
      <div ref={viewportRef} className="cs-webgl" aria-hidden="true" />
      <div className="cs-idea-sticker" aria-hidden="true"><span>✳</span> MAKE SOMETHING GREAT</div>
      <div className="cs-project-sticker" aria-hidden="true"><span>10</span><div>little tools.<br />big possibilities.</div></div>
      <div className="cs-drag-hint" aria-hidden="true"><span>↔</span> DRAG TO PLAY</div>
    </div>
  );
}
