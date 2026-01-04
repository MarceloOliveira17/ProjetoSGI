import * as THREE from "three";
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';


//Cores dos botoes
let alvo = null
let cor_antiga = null
let material_antigo = null
let cor_amarela = new THREE.Color('yellow')
let cor_vermelha = new THREE.Color("red")
let cor_verde = new THREE.Color("green")
let cor_azul = new THREE.Color("blue")
let cor_castanho = new THREE.Color("brown")
let cor_laranja = new THREE.Color("orange")

let material_novo = new THREE.MeshStandardMaterial({

    metalness: 0,
    roughness: 0.1,
    transparent: true,
    opacity: 0.4
})

// Criar cena do threeJS
let cena = new THREE.Scene();
window.cena = cena;

let mixer = null;         // O misturador de animações
let actionPrato = null;
let actionPickup = null;

let actionTampa = null; // Ação da tampa
let tampaMesh = null;   // O objeto 3D da tampa para detetar o clique
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Criar Renderer
const threeCanvas = document.getElementById('three-canvas');

// Crie o renderer com antialias e pixel ratio do dispositivo para bordas mais nítidas
let renderer = new THREE.WebGLRenderer({ canvas: threeCanvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(threeCanvas.clientWidth, threeCanvas.clientHeight);
renderer.setClearColor(0xffffff);

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

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    camara.aspect = width / height;
    camara.updateProjectionMatrix();
}

// Adicionar listener de redimensionamento
window.addEventListener('resize', onWindowResize, { passive: true });

// Chame uma vez para definir o tamanho correto
onWindowResize();


//Codigo botao cores

let btn_amarelo = document.getElementById('btn_amarelo')
let btn_vermelho = document.getElementById('btn_vermelho')
let btn_verde = document.getElementById('btn_verde')
let btn_azul = document.getElementById('btn_azul')
let btn_castanho = document.getElementById('btn_castanho')
let btn_laranja = document.getElementById('btn_laranja')
let btn_repor = document.getElementById('btn_repor')
let btn_vidro = document.getElementById('btn_vidro')


if (btn_amarelo) btn_amarelo.addEventListener('click', function () { mudarCor(cor_amarela) });
if (btn_vermelho) btn_vermelho.addEventListener('click', function () { mudarCor(cor_vermelha) });
if (btn_verde) btn_verde.addEventListener('click', function () { mudarCor(cor_verde) });
if (btn_azul) btn_azul.addEventListener('click', function () { mudarCor(cor_azul) });
if (btn_castanho) btn_castanho.addEventListener('click', function () { mudarCor(cor_castanho) });
if (btn_laranja) btn_laranja.addEventListener('click', function () { mudarCor(cor_laranja) });
if (btn_repor) btn_repor.addEventListener('click', repor);
if (btn_vidro) btn_vidro.addEventListener('click', mudarMaterial);


function mudarCor(cor_nova) {
    if (alvo == null) return

    if (alvo.material.color.equals(cor_nova)) return

    if (cor_antiga == null)
        cor_antiga = alvo.material.color.clone()

    alvo.material.color.copy(cor_nova)
    alvo.material.needsUpdate = true
}

function repor() {
    if (alvo == null)
        return

    if (material_antigo != null)
        alvo.material = material_antigo

    if (cor_antiga != null) {
        alvo.material.color = cor_antiga
        cor_antiga = null
    }

    alvo.castShadow = true
    alvo.visible = true
}


function mudarMaterial() {
    if (alvo == null)
        return

    if (material_antigo != null)
        null

    material_antigo = alvo.material
    alvo.material = material_novo
}

// Carregar modelo, ajustar luzes, e preparar cena exemplo
new GLTFLoader().load(
    // Caminho do Modelo
    'models/RecordPlayer.glb',
    function (gltf) {
        // Informação: 1 Unidade = 0.1m = 1 dm = 10 cm
        cena.add(gltf.scene);

        gltf.scene.traverse((obj) => {
            if (obj.isMesh) {
                if (obj.name === "Base") {
                    alvo = obj;

                }
            }
        });

        let baseMeshes = [];

        gltf.scene.traverse((obj) => {
            if (obj.isMesh) {
                if (obj.name === "Base") {
                    obj.material = obj.material.clone();
                    baseMeshes.push(obj);
                }
            }
        });

        mixer = new THREE.AnimationMixer(gltf.scene);
        if (gltf.animations.length > 0) {
            const clipPrato = THREE.AnimationClip.findByName(gltf.animations, "VinylDiskAction");
            const clipPickup = THREE.AnimationClip.findByName(gltf.animations, "PickupAction");
            const clipTampa = THREE.AnimationClip.findByName(gltf.animations, "DustCoverAction");

            actionPrato = mixer.clipAction(clipPrato);
            actionPrato.loop = THREE.LoopRepeat;

            actionPickup = mixer.clipAction(clipPickup);

            actionPickup.setLoop(THREE.LoopOnce); // Faz a animação correr apenas uma vez
            actionPickup.clampWhenFinished = true; // Mantém o objeto no último frame quando terminar

            if (clipTampa) {
                actionTampa = mixer.clipAction(clipTampa);
                actionTampa.setLoop(THREE.LoopOnce);
                actionTampa.clampWhenFinished = true;
            }

            // Iniciar a animação do prato, mas pausada
            actionPrato.play();
            actionPrato.paused = true;

            actionPickup.play();
            actionPickup.paused = true;

            // 2. Identificar o objeto da tampa para o clique
            gltf.scene.traverse((obj) => {
                if (obj.isMesh && (obj.name === "DustCover" || obj.name === "Tampa")) {
                    tampaMesh = obj;
                }
            });
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

        document.querySelectorAll(".color-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const color = btn.dataset.color;

                baseMeshes.forEach(mesh => {
                    mesh.material.color.set(color);
                    mesh.material.needsUpdate = true;
                });
            });
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

        console.log(
            gltf.animations.map(a => a.name)
        );

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


    //Define os desenhos dos ícones (apenas a parte de dentro do SVG)
    const iconePlay = '<polygon points="5 3 19 12 5 21 5 3"></polygon>';
    const iconePause = '<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>';

    const btnPrato = document.getElementById('btn-prato');
    const iconSvg = document.getElementById('icon-svg'); 
    const btnTexto = btnPrato.querySelector('span');    

    btnPrato.addEventListener('click', (evento) => {
        evento.stopPropagation();

        if (!actionPrato || !actionPickup) return;

        if (actionPrato.paused) {
            // --- ESTADO: VAI COMEÇAR A TOCAR ---
            actionPrato.paused = false;
            actionPrato.play();

            actionPickup.paused = false;
            actionPickup.timeScale = 1;
            actionPickup.play();

            // Mudar para ícone de PAUSE e texto STOP
            iconSvg.innerHTML = iconePause;
            btnTexto.innerText = "Stop";
        }
        else {
            actionPrato.paused = true;

            actionPickup.paused = false;
            actionPickup.timeScale = -1;
            actionPickup.play();

            // Mudar para ícone de PLAY e texto PLAY
            iconSvg.innerHTML = iconePlay;
            btnTexto.innerText = "Play";
        }
    });

    threeCanvas.addEventListener('click', (evento) => {
        const rect = threeCanvas.getBoundingClientRect();
        mouse.x = ((evento.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((evento.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camara);

        if (tampaMesh && actionTampa) {
            const intersecoes = raycaster.intersectObject(tampaMesh);

            if (intersecoes.length > 0) {
                // 1. Tirar a animação do estado de pausa
                actionTampa.paused = false;

                // 2. Inverter a direção
                actionTampa.timeScale *= -1;

                // 3. Se a animação terminou no estado "aberto" e queremos fechar
                if (actionTampa.timeScale === -1 && actionTampa.time >= actionTampa.getClip().duration) {
                    actionTampa.time = actionTampa.getClip().duration;
                }
                // 4. Se a animação terminou no estado "fechado" e queremos abrir
                else if (actionTampa.timeScale === 1 && actionTampa.time <= 0) {
                    actionTampa.time = 0;
                }

                // 5. Garantir que o mixer continua a processar a animação
                actionTampa.play();

            }
        }
    });
}