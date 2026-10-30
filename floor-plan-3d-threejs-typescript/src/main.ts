import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

type RoomInfo = {
    title: string;
    square_m: number;
    bedrooms: number;
    bathrooms: number;
    balcony: boolean;
};

const roomInfoMap: Record<string, RoomInfo> = {
    "room-1-1": { title: "Dzīvoklis Saule", square_m: 44, bedrooms: 1, bathrooms: 1, balcony: true },
    "room-1-2": { title: "Dzīvoklis Ozols", square_m: 67, bedrooms: 2, bathrooms: 2, balcony: true },
    "room-1-3": { title: "Dzīvoklis Dzintars", square_m: 82, bedrooms: 3, bathrooms: 2, balcony: true },
    "room-1-4": { title: "Dzīvoklis Ziedi", square_m: 52, bedrooms: 1, bathrooms: 1, balcony: true },
    "room-1-5": { title: "Dzīvoklis Liepa", square_m: 82, bedrooms: 2, bathrooms: 1, balcony: true },

    "room-2-1": { title: "Dzīvoklis Jūra", square_m: 44, bedrooms: 1, bathrooms: 1, balcony: true },
    "room-2-2": { title: "Dzīvoklis Medus", square_m: 67, bedrooms: 2, bathrooms: 2, balcony: true },
    "room-2-3": { title: "Dzīvoklis Zvaigzne", square_m: 82, bedrooms: 3, bathrooms: 2, balcony: true },
    "room-2-4": { title: "Dzīvoklis Rasa", square_m: 52, bedrooms: 1, bathrooms: 1, balcony: true },
    "room-2-5": { title: "Dzīvoklis Pērle", square_m: 82, bedrooms: 2, bathrooms: 1, balcony: true },

    "room-3-1": { title: "Dzīvoklis Vējš", square_m: 44, bedrooms: 1, bathrooms: 1, balcony: true },
    "room-3-2": { title: "Dzīvoklis Dūja", square_m: 67, bedrooms: 2, bathrooms: 2, balcony: true },
    "room-3-3": { title: "Dzīvoklis Mežs", square_m: 82, bedrooms: 3, bathrooms: 2, balcony: true },
    "room-3-4": { title: "Dzīvoklis Lāse", square_m: 52, bedrooms: 1, bathrooms: 1, balcony: true },
    "room-3-5": { title: "Dzīvoklis Saugrieži", square_m: 82, bedrooms: 2, bathrooms: 1, balcony: true },

    "room-4-1": { title: "Dzīvoklis Zibsnis", square_m: 44, bedrooms: 1, bathrooms: 1, balcony: true },
    "room-4-2": { title: "Dzīvoklis Mākoņi", square_m: 67, bedrooms: 2, bathrooms: 2, balcony: true },
    "room-4-3": { title: "Dzīvoklis Zeme", square_m: 82, bedrooms: 3, bathrooms: 2, balcony: true },
    "room-4-4": { title: "Dzīvoklis Ūdens", square_m: 52, bedrooms: 1, bathrooms: 1, balcony: true },
    "room-4-5": { title: "Dzīvoklis Gaiss", square_m: 82, bedrooms: 2, bathrooms: 1, balcony: true },

    "room-5-1": { title: "Dzīvoklis Skanējums", square_m: 44, bedrooms: 1, bathrooms: 1, balcony: true },
    "room-5-2": { title: "Dzīvoklis Mirdzums", square_m: 67, bedrooms: 2, bathrooms: 2, balcony: true },
    "room-5-3": { title: "Dzīvoklis Klints", square_m: 82, bedrooms: 3, bathrooms: 2, balcony: true },
    "room-5-4": { title: "Dzīvoklis Dzirksts", square_m: 52, bedrooms: 1, bathrooms: 1, balcony: true },
    "room-5-5": { title: "Dzīvoklis Vārpa", square_m: 82, bedrooms: 2, bathrooms: 1, balcony: true }
};

// colors
const COLORS = {
    wall: 0xd8d3ca,
    room: 0xf4f1ec,
    hallway: 0xc7c2b8,
    roof: 0x8d939b,
};
const HOVER_COLOR = new THREE.Color(0x26C281); // green
const SELECT_COLOR = new THREE.Color(0x4A90E2); // blue
const DIMMED_OPACITY = 0.2;

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const infoBox = document.getElementById('room-info')!;
const resetBtn = document.getElementById('reset-btn')!;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(60, 30, 40);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// lights
scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8a8a, 1.2));

const sun = new THREE.DirectionalLight(0xfff4e6, 2);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.001;
sun.shadow.normalBias = 0.05;
scene.add(sun, sun.target);

const fillLight = new THREE.DirectionalLight(0xe0f0ff, 0.5);
fillLight.position.set(-10, 5, -10);
scene.add(fillLight);

// model parts
const allWalls: THREE.Mesh[] = [];
const allRooms: THREE.Mesh[] = [];
const allHallways: THREE.Mesh[] = [];
let roofObject: THREE.Mesh | null = null;

let currentFloor: string | null = null;
let hoveredObject: THREE.Mesh | null = null;
let selectedRoom: THREE.Mesh | null = null;

const loader = new GLTFLoader();
loader.load(
    `${import.meta.env.BASE_URL}plan-quick.glb`,
    (gltf) => {
        gltf.scene.traverse((child) => {
            if (!(child instanceof THREE.Mesh)) return;

            const type = child.name.toLowerCase() === 'roof' ? 'roof' : child.name.split('-')[0];
            const color = COLORS[type as keyof typeof COLORS] ?? COLORS.wall;

            child.material = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0 });
            child.userData.baseColor = new THREE.Color(color);
            child.castShadow = true;
            child.receiveShadow = true;

            if (type === 'wall') allWalls.push(child);
            else if (type === 'room') allRooms.push(child);
            else if (type === 'hallway') allHallways.push(child);
            else if (type === 'roof') roofObject = child;
        });

        scene.add(gltf.scene);
        frameModel(gltf.scene);
    },
    undefined,
    (err) => console.error('Failed to load model', err)
);

function frameModel(model: THREE.Object3D) {
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).length();

    controls.target.copy(center);
    camera.position.copy(center).add(new THREE.Vector3(1, 0.6, 0.8).normalize().multiplyScalar(size * 1.05));
    controls.update();

    sun.position.copy(center).add(new THREE.Vector3(0.5, 1, 0.4).multiplyScalar(size));
    sun.target.position.copy(center);
    const cam = sun.shadow.camera;
    cam.left = cam.bottom = -size / 2;
    cam.right = cam.top = size / 2;
    cam.far = size * 3;
    cam.updateProjectionMatrix();
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function pick(event: PointerEvent): THREE.Mesh | null {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    const targets = currentFloor ? roomsOnFloor(currentFloor) : allWalls;
    const hit = raycaster.intersectObjects(targets, false)[0];
    return hit ? (hit.object as THREE.Mesh) : null;
}

const floorOf = (mesh: THREE.Object3D) => Number(mesh.name.split('-')[1]);
const roomsOnFloor = (floor: string) => allRooms.filter(room => room.name.startsWith(`room-${floor}-`));

canvas.addEventListener('pointermove', (event) => {
    const hit = pick(event);
    if (hit === hoveredObject) return;

    const previous = hoveredObject;
    hoveredObject = hit;
    if (previous) paint(previous);
    if (hit) paint(hit);
    canvas.style.cursor = hit ? 'pointer' : '';
});

canvas.addEventListener('pointerleave', () => {
    const previous = hoveredObject;
    hoveredObject = null;
    if (previous) paint(previous);
});

const downAt = new THREE.Vector2();
canvas.addEventListener('pointerdown', (event) => downAt.set(event.clientX, event.clientY));
canvas.addEventListener('pointerup', (event) => {
    if (downAt.distanceTo(new THREE.Vector2(event.clientX, event.clientY)) > 5) return;

    const hit = pick(event);
    if (!currentFloor) {
        if (hit) selectFloor(hit.name.split('-')[1]);
    } else {
        selectRoom(hit);
    }
});

resetBtn.addEventListener('click', resetView);
window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && currentFloor) resetView();
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

function selectFloor(floorNum: string) {
    currentFloor = floorNum;
    if (roofObject) roofObject.visible = false;

    const selected = Number(floorNum);
    for (const mesh of [...allWalls, ...allRooms, ...allHallways]) {
        const floor = floorOf(mesh);
        mesh.visible = floor <= selected; // cut away everything above
        setOpacity(mesh, mesh.name === `wall-${floorNum}` ? DIMMED_OPACITY : 1);
    }

    clearHover();
    resetBtn.style.display = 'block';
}

function resetView() {
    currentFloor = null;
    if (roofObject) roofObject.visible = true;

    for (const mesh of [...allWalls, ...allRooms, ...allHallways]) {
        mesh.visible = true;
        setOpacity(mesh, 1);
    }

    clearHover();
    selectRoom(null);
    resetBtn.style.display = 'none';
}

function selectRoom(room: THREE.Mesh | null) {
    const previous = selectedRoom;
    selectedRoom = room;
    if (previous) paint(previous);
    if (room) paint(room);

    const info = room && roomInfoMap[room.name];
    if (!info) {
        infoBox.style.display = 'none';
        return;
    }

    infoBox.innerHTML = `
        <strong>${info.title}</strong>
        <span class="highlight">Platība:</span> ${info.square_m} m²<br>
        <span class="highlight">Guļamistabas:</span> ${info.bedrooms}<br>
        <span class="highlight">Sanitārie mezgli:</span> ${info.bathrooms}<br>
        <span class="highlight">Balkons:</span> ${info.balcony ? '<span class="yes">Ir</span>' : '<span class="no">Nav</span>'}
    `;
    infoBox.style.display = 'block';
}

function clearHover() {
    const previous = hoveredObject;
    hoveredObject = null;
    if (previous) paint(previous);
    canvas.style.cursor = '';
}

function paint(mesh: THREE.Mesh) {
    const mat = mesh.material as THREE.MeshStandardMaterial;

    if (mesh === hoveredObject) {
        mat.color.copy(HOVER_COLOR);
        mat.emissive.copy(HOVER_COLOR).multiplyScalar(0.25);
    } else if (mesh === selectedRoom) {
        mat.color.copy(SELECT_COLOR);
        mat.emissive.copy(SELECT_COLOR).multiplyScalar(0.25);
    } else {
        mat.color.copy(mesh.userData.baseColor);
        mat.emissive.setRGB(0, 0, 0);
    }
}

function setOpacity(mesh: THREE.Mesh, opacity: number) {
    const mat = mesh.material as THREE.MeshStandardMaterial;
    mat.transparent = opacity < 1;
    mat.opacity = opacity;
    mat.depthWrite = opacity === 1;
    mesh.castShadow = opacity === 1;
}

renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
});
