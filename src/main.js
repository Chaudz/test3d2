import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

let scene; // Định nghĩa scene ở phạm vi ngoài để có thể cập nhật background
let ambientLight, dirLight;

function updateSceneBackground() {
  if (!scene) return;
  if (document.body.classList.contains("dark-mode")) {
    // scene.background = new THREE.Color("#181a20");
    if (ambientLight) ambientLight.intensity = 1.1;
    if (dirLight) dirLight.intensity = 1.3;
  } else {
    // scene.background = new THREE.Color("#f6efe6");
    if (ambientLight) ambientLight.intensity = 0.7;
    if (dirLight) dirLight.intensity = 1.0;
  }
}

const camera = new THREE.PerspectiveCamera(65, 1, 0.1, 100);
camera.position.set(0, 2, 6);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
const canvasDiv = document.getElementById("app");
renderer.setSize(canvasDiv.clientWidth, canvasDiv.clientHeight);
canvasDiv.appendChild(renderer.domElement);

// Ánh sáng
scene = new THREE.Scene();
updateSceneBackground();

// Ánh sáng
ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(5, 10, 7.5);
scene.add(ambientLight);
scene.add(dirLight);

// Load model
let model;
const loader = new GLTFLoader();
// loader.load("/medieval_fantasy_book/scene.gltf", (gltf) => {
//   model = gltf.scene;

//   // ⚙️ CHỈNH SIZE, VỊ TRÍ, XOAY
//   model.scale.set(1, 1, 1); // tuỳ chỉnh scale
//   model.position.set(0, 0, 0); // chỉnh vị trí nếu bị lệch
//   model.rotation.set(0, 0, 0); // xoay ngược nếu cần

//   scene.add(model);
//   animate();
// });

let minCameraZ = 6; // gần nhất
let maxCameraZ = 30; // xa nhất
let targetCameraZ = 12; // mặc định

loader.load("/medieval_fantasy_book/scene.gltf", (gltf) => {
  model = gltf.scene;
  // Tính bounding box
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  // Đưa model về tâm (0,0,0)
  model.position.x += -center.x;
  model.position.y += -center.y;
  model.position.z += -center.z;
  // Lấy aspect thực tế của canvas
  const w = canvasDiv.clientWidth,
    h = canvasDiv.clientHeight;

  const aspect = w / h;
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
  // Camera setup
  const maxHorizontal = Math.max(size.x, size.z);
  const margin = 1.3; // margin hợp lý
  const fov = camera.fov * (Math.PI / 180);
  // Tính khoảng cách camera mặc định để vừa khung ngang
  targetCameraZ = (maxHorizontal * margin) / (2 * Math.tan(fov / 2)) / aspect;
  minCameraZ = targetCameraZ * 0.6;
  maxCameraZ = targetCameraZ * 2.5;
  camera.position.set(0, size.y * 0.18, targetCameraZ);
  camera.lookAt(0, 0, 0);
  model.scale.set(1, 1, 1);

  // model.scale.set(0.9, 0.9, 0.9);
  scene.add(model);
  animate();
});

// Drag xoay model
let isDragging = false,
  prev = { x: 0, y: 0 };
let targetRotation = { x: 0, y: 0 };
let currentRotation = { x: 0, y: 0 };
let targetScale = 1;
let currentScale = 1;
let isHover = false;

renderer.domElement.addEventListener("mousedown", (e) => {
  isDragging = true;
  prev = { x: e.clientX, y: e.clientY };
});
renderer.domElement.addEventListener("mouseup", () => {
  isDragging = false;
});
renderer.domElement.addEventListener("mouseleave", () => {
  isDragging = false;
});
renderer.domElement.addEventListener("mousemove", (e) => {
  if (!isDragging || !model) return;
  const dx = e.clientX - prev.x,
    dy = e.clientY - prev.y;
  targetRotation.y += dx * 0.01;
  targetRotation.x += dy * 0.01;
  prev = { x: e.clientX, y: e.clientY };
});
renderer.domElement.addEventListener("mouseenter", () => {
  isHover = true;
});
renderer.domElement.addEventListener("mouseleave", () => {
  isHover = false;
});
renderer.domElement.addEventListener(
  "wheel",
  (e) => {
    if (!isHover) return;
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    // Zoom bằng cách di chuyển camera dọc trục Z
    targetCameraZ += e.deltaY * 0.2;
    // targetCameraZ = Math.max(minCameraZ, Math.min(maxCameraZ, targetCameraZ));
  },
  { passive: false }
);

// Responsive: cập nhật lại aspect camera khi resize
window.addEventListener("resize", () => {
  const w = canvasDiv.clientWidth,
    h = canvasDiv.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
});

// Trong animate, sau khi xoay model, kiểm tra nếu model bị cắt thì tự động lùi camera ra xa hơn
function isBoxMostlyInView(box, camera) {
  const points = [
    new THREE.Vector3(box.min.x, box.min.y, box.min.z),
    new THREE.Vector3(box.min.x, box.min.y, box.max.z),
    new THREE.Vector3(box.min.x, box.max.y, box.min.z),
    new THREE.Vector3(box.min.x, box.max.y, box.max.z),
    new THREE.Vector3(box.max.x, box.min.y, box.min.z),
    new THREE.Vector3(box.max.x, box.min.y, box.max.z),
    new THREE.Vector3(box.max.x, box.max.y, box.min.z),
    new THREE.Vector3(box.max.x, box.max.y, box.max.z),
  ];
  let inCount = 0;
  for (const p of points) {
    const projected = p.clone().project(camera);
    if (
      projected.x >= -1 &&
      projected.x <= 1 &&
      projected.y >= -1 &&
      projected.y <= 1 &&
      projected.z >= -1 &&
      projected.z <= 1
    ) {
      inCount++;
    }
  }
  return inCount >= 5;
}

function animate() {
  requestAnimationFrame(animate);
  if (model) {
    // Xoay mượt
    currentRotation.x += (targetRotation.x - currentRotation.x) * 0.15;
    currentRotation.y += (targetRotation.y - currentRotation.y) * 0.15;
    // Luôn tự động xoay quanh trục Y
    targetRotation.y += 0.003;
    model.rotation.x = currentRotation.x;
    model.rotation.y = currentRotation.y;
    // Zoom mượt bằng camera
    camera.position.z += (targetCameraZ - camera.position.z) * 0.15;
    if (camera.position.z < minCameraZ) camera.position.z = minCameraZ;
    if (camera.position.z > maxCameraZ) camera.position.z = maxCameraZ;
    camera.lookAt(0, 0, 0);
    // Auto-fit: nếu model bị cắt thì tự động lùi camera ra xa hơn
    const box = new THREE.Box3().setFromObject(model);
    let safeCount = 0,
      maxSafe = 20;
    while (
      !isBoxMostlyInView(box, camera) &&
      camera.position.z < maxCameraZ &&
      safeCount < maxSafe
    ) {
      camera.position.z += 0.2;
      safeCount++;
    }
  }
  renderer.render(scene, camera);
}

// Dark mode toggle
function setDarkMode(on) {
  if (on) {
    document.body.classList.add("dark-mode");
    localStorage.setItem("dark-mode", "1");
    const btn = document.querySelector(".mode-toggle");
    if (btn) btn.textContent = "☀️";
  } else {
    document.body.classList.remove("dark-mode");
    localStorage.setItem("dark-mode", "0");
    const btn = document.querySelector(".mode-toggle");
    if (btn) btn.textContent = "🌙";
  }
  updateSceneBackground();
}
// Load trạng thái dark mode khi vào trang
if (localStorage.getItem("dark-mode") === "1") {
  setDarkMode(true);
} else {
  setDarkMode(false);
}
// Gắn sự kiện cho nút
setTimeout(() => {
  const btn = document.querySelector(".mode-toggle");
  if (btn) {
    btn.addEventListener("click", () => {
      setDarkMode(!document.body.classList.contains("dark-mode"));
    });
  }
}, 200);
