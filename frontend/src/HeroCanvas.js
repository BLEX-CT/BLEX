import { useEffect, useRef } from "react";

export default function HeroCanvas({ color }) {
  const ref = useRef();
  useEffect(() => {
    const THREE = window.THREE;
    if (!THREE) return;
    const canvas = ref.current;
    if (!canvas) return;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(60, 2, 0.1, 100);
    cam.position.z = 22;
    const col = new THREE.Color(color || "#00d4ff");
    const geos = [
      new THREE.BoxGeometry(0.9, 0.9, 0.9),
      new THREE.SphereGeometry(0.45, 7, 7),
      new THREE.TorusGeometry(0.45, 0.16, 7, 14)
    ];
    const meshes = Array.from({ length: 28 }, (_, i) => {
      const mat = new THREE.MeshBasicMaterial({ color: col, wireframe: true, transparent: true, opacity: 0.22 + Math.random() * 0.3 });
      const mesh = new THREE.Mesh(geos[i % 3], mat);
      mesh.position.set((Math.random() - 0.5) * 46, (Math.random() - 0.5) * 24, (Math.random() - 0.5) * 12);
      mesh.rotation.set(Math.random() * 6, Math.random() * 6, 0);
      mesh.userData = { vy: (Math.random() - 0.5) * 0.0014, rx: (Math.random() - 0.5) * 0.003, ry: (Math.random() - 0.5) * 0.004, vx: (Math.random() - 0.5) * 0.001 };
      scene.add(mesh);
      return mesh;
    });
    const resize = () => {
      const w = canvas.offsetWidth, h = canvas.offsetHeight || w / 2;
      renderer.setSize(w, h, false);
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
    };
    resize();
    window.addEventListener("resize", resize);
    let id;
    const tick = () => {
      id = requestAnimationFrame(tick);
      meshes.forEach(m => {
        m.rotation.x += m.userData.rx; m.rotation.y += m.userData.ry;
        m.position.y += m.userData.vy; m.position.x += m.userData.vx;
        if (m.position.y > 13) m.position.y = -13;
        if (m.position.y < -13) m.position.y = 13;
        if (Math.abs(m.position.x) > 25) m.userData.vx *= -1;
      });
      renderer.render(scene, cam);
    };
    tick();
    return () => { cancelAnimationFrame(id); window.removeEventListener("resize", resize); renderer.dispose(); };
  }, [color]);
  return <canvas ref={ref} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 1, pointerEvents: "none", opacity: 0.65 }} />;
}
