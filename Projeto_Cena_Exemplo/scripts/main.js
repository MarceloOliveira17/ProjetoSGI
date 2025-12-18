import * as THREE from "three";
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Criar cena do threeJS
let cena = new THREE.Scene();
window.cena = cena;

let mixer = null;         // O misturador de animações
let actionPrato = null;   // A ação específica do prato

// Criar Renderer
const threeCanvas = document.getElementById('three-canvas');

// Crie o renderer com antialias e pixel ratio do dispositivo para bordas mais nítidas
let renderer = new THREE.WebGLRenderer({ canvas: threeCanvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(threeCanvas.clientWidth, threeCanvas.clientHeight);
renderer.setClearColor(0xffffff); // Cor de Fundo (Branco neste caso concreto)

// Ativar renderização de mapa de sombras
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Criar e preparar câmara
let camara = new THREE.PerspectiveCamera(60, threeCanvas.clientWidth / threeCanvas.clientHeight, 0.01, 1000);
let controls = new OrbitControls(camara, renderer.domElement);

// Posicão Padrão da Camara
camara.position.set(0.739, 0.356, -0.038);
camara.rotation.set(
    THREE.MathUtils.degToRad(-96.60),
    THREE.MathUtils.degToRad(72.89),
    THREE.MathUtils.degToRad(96.90)
);

// Usar a origem como alvo inicial dos controlos e atualizar os controlos para que a visualização corresponda
controls.target.set(0, 0, 0);
controls.update();

// Adicionar luz ambiente
const ambientLight = new THREE.AmbientLight(0xffffff, 3);
cena.add(ambientLight);

// Mantenha o renderer e a câmara responsivos ao tamanho da janela
function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Redimensiona o estilo do canvas e o buffer de desenho do renderer
    threeCanvas.style.width = width + 'px';
    threeCanvas.style.height = height + 'px';
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    camara.aspect = width / height;
    camara.updateProjectionMatrix();
}

// Adicionar listener de redimensionamento
window.addEventListener('resize', onWindowResize, { passive: true });

// Chame uma vez para definir o tamanho correto
onWindowResize();

// Carregar modelo, ajustar luzes, e preparar cena exemplo
new GLTFLoader().load(
    // Caminho do Modelo
    'models/RecordPlayer.glb',
    function (gltf) {
        // Informação: 1 Unidade = 0.1m = 1 dm = 10 cm
        cena.add(gltf.scene);

        mixer = new THREE.AnimationMixer(gltf.scene);
        if (gltf.animations.length > 0) {
            actionPrato = mixer.clipAction(gltf.animations[0]);
            actionPrato.loop = THREE.LoopRepeat;

            // 🔴 IMPORTANTE: iniciar e pausar
            actionPrato.play();
            actionPrato.paused = true;
        }


        // Ativar sombras em todas as malhas do modelo carregado
        gltf.scene.traverse((obj) => {
            if (obj.isMesh) {
                obj.castShadow = true;
                obj.receiveShadow = true;
                
                // Garantir que o material seja atualizado se necessário
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(m => {
                        if (m) {
                            if (m.opacity < 1 || m.alphaMode === 'BLEND' || m.transmission > 0) {
                                m.transparent = true;
                                m.depthWrite = false;
                            }
                            m.needsUpdate = true;
                        }
                    });
                } else if (obj.material) {
                    if (obj.material.opacity < 1 || obj.material.alphaMode === 'BLEND' || obj.material.transmission > 0) {
                        obj.material.transparent = true;
                        obj.material.depthWrite = false;
                    }
                    obj.material.needsUpdate = true;
                }
            }
        });

        // Calcular o centro da caixa delimitadora do modelo e recentralizar
        try {
            const bbox = new THREE.Box3().setFromObject(gltf.scene);
            const modelCenter = new THREE.Vector3();
            bbox.getCenter(modelCenter);

            // Mover controls.target para o centro do modelo
            controls.target.copy(modelCenter);

            // Manter o deslocamento da câmara relativo ao centro do modelo
            const currentCamPos = camara.position.clone();
            const offsetFromOrigin = currentCamPos.clone();

            const newCamPos = modelCenter.clone().add(offsetFromOrigin);
            camara.position.copy(newCamPos);
            camara.lookAt(modelCenter);
            controls.update();

            console.log('Camera repositioned to:', camara.position);
        } catch (err) {
            console.warn('Could not compute model center or reposition camera:', err);
        }
    }
);

// Renderizar/Animar
{
    let delta = 0;
    let relogio = new THREE.Clock();
    let latencia_minima = 1 / 60; // para 60 frames por segundo 
    
    animar();

    function animar() {
        requestAnimationFrame(animar);
        delta += relogio.getDelta();

        if (delta < latencia_minima) return;

        if (mixer) mixer.update(latencia_minima);

        // Atualize os helpers de luz, se existirem
        cena.traverse((child) => {
            if (
                child instanceof THREE.PointLightHelper || 
                child instanceof THREE.SpotLightHelper || 
                child instanceof THREE.DirectionalLightHelper
            ) {
                child.update();
            }
        });

        renderer.render(cena, camara);
        delta = delta % latencia_minima;
    }

    const btnPrato = document.getElementById('btn-prato');
    const btnTexto = btnPrato.querySelector('span');

    btnPrato.addEventListener('click', () => {
        if (!actionPrato) {
            console.warn("A animação ainda não foi carregada ou não existe no modelo.");
            return;
        }

        // ✔️ Lógica correta: apenas alternar paused
        actionPrato.paused = !actionPrato.paused;

        btnTexto.innerText = actionPrato.paused
            ? "Ligar Prato"
            : "Parar Prato";
    });
}