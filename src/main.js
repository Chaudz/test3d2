import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const scene = new THREE.Scene();
// Đặt background trùng màu nền ngoài cho hoà hợp
scene.background = new THREE.Color("#f6efe6");

// Camera góc nhìn tự nhiên
const camera = new THREE.PerspectiveCamera(65, 1, 0.1, 100);
camera.position.set(0, 2, 6);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
const canvasDiv = document.getElementById("app");
renderer.setSize(canvasDiv.clientWidth, canvasDiv.clientHeight);
canvasDiv.appendChild(renderer.domElement);

// Ánh sáng
scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const light = new THREE.DirectionalLight(0xffffff, 1);
// light.position.set(5, 10, 7.5);
scene.add(light);

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
  const margin = 1.8;
  const fov = camera.fov * (Math.PI / 180);
  // Tính khoảng cách camera mặc định để vừa khung ngang
  targetCameraZ = (maxHorizontal * margin) / (2 * Math.tan(fov / 2)) / aspect;
  minCameraZ = targetCameraZ * 0.6;
  maxCameraZ = targetCameraZ * 2.5;
  camera.position.set(0, size.y * 0.18, targetCameraZ);
  camera.lookAt(0, 0, 0);
  model.scale.set(1, 1, 1);
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
    targetCameraZ += e.deltaY * 0.02;
    targetCameraZ = Math.max(minCameraZ, Math.min(maxCameraZ, targetCameraZ));
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
    camera.lookAt(0, 0, 0);
  }
  renderer.render(scene, camera);
}
