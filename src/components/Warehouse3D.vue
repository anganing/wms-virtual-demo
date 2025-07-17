<template>
  <div style="position: relative; width: 100%; height: 600px;">
    <div ref="container" class="warehouse-3d" style="width: 100%; height: 600px;"></div>
    <!-- Mini Axes Gizmo -->
    <div ref="gizmoContainer" style="position: absolute; right: 16px; bottom: 16px; width: 100px; height: 100px; pointer-events: none;"></div>
    <el-dialog v-model="chooseDialogVisible" title="选择库位" width="320px" @close="chooseDialogVisible=false">
      <el-table :data="intersectedSlots" style="width: 100%" @row-click="chooseSlot">
        <el-table-column prop="row" label="排" width="50" />
        <el-table-column prop="column" label="列" width="50" />
        <el-table-column prop="level" label="层" width="50" />
        <el-table-column prop="status" label="状态" :formatter="statusFormat" />
      </el-table>
    </el-dialog>
    <SlotInfo v-if="selectedSlot" :slot="selectedSlot" @close="closeSlotInfo" />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, defineExpose, nextTick } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import SlotInfo from './SlotInfo.vue'

const props = defineProps({
  slots: Array,
  rows: Number,
  columns: Number,
  levels: Number,
  externalSelectedSlot: Object,
  highlightSlots: Array
})
const emit = defineEmits(['clear-external-selected'])

const container = ref(null)
const gizmoContainer = ref(null)
const selectedSlot = ref(null)
const chooseDialogVisible = ref(false)
const intersectedSlots = ref([])

const slotSize = 1.2
const statusColor = {
  empty: 0xcccccc,
  occupied: 0x00ff00,
  reserved: 0xffa500
}
const highlightColor = 0xff3399

let scene, camera, renderer, raycaster, mouse, slotMeshes = [], controls, axesHelper
let labelX, labelY, labelZ, labelXc, labelYc, labelZc
// Mini Gizmo
let gizmoScene, gizmoCamera, gizmoRenderer, gizmoAxes, gizmoLabelX, gizmoLabelY, gizmoLabelZ, gizmoLabelXc, gizmoLabelYc, gizmoLabelZc

function createAxisLabel(text, color) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  ctx.font = 'bold 120px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = color
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 10
  ctx.strokeText(text, 128, 128)
  ctx.fillText(text, 128, 128)
  const texture = new THREE.CanvasTexture(canvas)
  const material = new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false })
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(0.9, 0.9, 0.9)
  return sprite
}

function createAxisLabelCN(text, color) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  ctx.font = 'bold 90px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = color
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 8
  ctx.strokeText(text, 128, 128)
  ctx.fillText(text, 128, 128)
  const texture = new THREE.CanvasTexture(canvas)
  const material = new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false })
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(0.7, 0.7, 0.7)
  return sprite
}

function isSlotHighlighted(slot) {
  if (!props.highlightSlots || !props.highlightSlots.length) return false
  return props.highlightSlots.some(s => s.row === slot.row && s.column === slot.column && s.level === slot.level)
}

function renderSlots() {
  // 清除旧的 mesh
  slotMeshes.forEach(mesh => scene.remove(mesh))
  slotMeshes = []
  props.slots.forEach((slot) => {
    const geometry = new THREE.BoxGeometry(slotSize, slotSize, slotSize)
    const color = isSlotHighlighted(slot) ? highlightColor : (statusColor[slot.status] || 0xcccccc)
    const material = new THREE.MeshLambertMaterial({ color })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(
      (slot.column - (props.columns + 1) / 2) * (slotSize + 0.2),
      (slot.level - 1) * (slotSize + 0.2) + slotSize / 2,
      (slot.row - (props.rows + 1) / 2) * (slotSize + 0.2)
    )
    mesh.userData = { slot }
    scene.add(mesh)
    slotMeshes.push(mesh)
    // 高亮描边
    if (isSlotHighlighted(slot)) {
      const edges = new THREE.EdgesGeometry(geometry)
      const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffff00, linewidth: 2 }))
      line.position.copy(mesh.position)
      scene.add(line)
      slotMeshes.push(line)
    }
  })
}

function initThree() {
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(60, container.value.clientWidth / container.value.clientHeight, 0.1, 100)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.value.clientWidth, container.value.clientHeight)
  container.value.appendChild(renderer.domElement)

  // 灯光
  scene.add(new THREE.AmbientLight(0xffffff, 0.7))
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.6)
  dirLight.position.set(10, 20, 10)
  scene.add(dirLight)

  // 坐标轴辅助
  axesHelper = new THREE.AxesHelper(4)
  scene.add(axesHelper)

  // 轴文字标注
  labelX = createAxisLabel('X', '#ff3333')
  labelY = createAxisLabel('Y', '#33ff33')
  labelZ = createAxisLabel('Z', '#3399ff')
  labelX.position.set(4.7, 0, 0)
  labelY.position.set(0, 4.7, 0)
  labelZ.position.set(0, 0, 4.7)
  scene.add(labelX)
  scene.add(labelY)
  scene.add(labelZ)
  // 中文标注
  labelXc = createAxisLabelCN('排', '#ff3333')
  labelYc = createAxisLabelCN('层', '#33ff33')
  labelZc = createAxisLabelCN('列', '#3399ff')
  labelXc.position.set(5.7, 0, 0)
  labelYc.position.set(0, 5.7, 0)
  labelZc.position.set(0, 0, 5.7)
  scene.add(labelXc)
  scene.add(labelYc)
  scene.add(labelZc)

  // OrbitControls
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.enablePan = true
  controls.enableZoom = true

  // 关键：controls 初始化后立即重置视角
  resetView()

  raycaster = new THREE.Raycaster()
  mouse = new THREE.Vector2()

  renderer.domElement.addEventListener('click', onClick)
  renderSlots()
  animate()
  nextTick(() => initGizmo())
}

function animate() {
  requestAnimationFrame(animate)
  controls && controls.update()
  renderer.render(scene, camera)
  renderGizmo()
}

function onClick(event) {
  const rect = renderer.domElement.getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObjects(slotMeshes)
  if (intersects.length === 1) {
    selectedSlot.value = intersects[0].object.userData.slot
  } else if (intersects.length > 1) {
    // 多个库位，弹出选择
    intersectedSlots.value = intersects.map(i => i.object.userData.slot)
    chooseDialogVisible.value = true
  }
}

function chooseSlot(slot) {
  selectedSlot.value = slot
  chooseDialogVisible.value = false
}

function statusFormat(row) {
  const map = { empty: '空库位', occupied: '已占用', reserved: '预留' }
  return map[row.status] || row.status
}

function resetView() {
  if (!camera || !controls) return
  camera.position.set(6, 8, 12)
  camera.lookAt(0, 0, 0)
  controls.target.set(0, 0, 0)
  controls.update()
}

defineExpose({ resetView })

// Mini Axes Gizmo
function initGizmo() {
  if (!gizmoContainer.value) return
  gizmoScene = new THREE.Scene()
  gizmoCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 10)
  gizmoCamera.position.set(0, 0, 5)
  gizmoRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
  gizmoRenderer.setSize(100, 100)
  gizmoRenderer.setClearColor(0x000000, 0)
  gizmoContainer.value.innerHTML = ''
  gizmoContainer.value.appendChild(gizmoRenderer.domElement)
  gizmoAxes = new THREE.AxesHelper(2)
  gizmoScene.add(gizmoAxes)
  gizmoLabelX = createAxisLabel('X', '#ff3333')
  gizmoLabelY = createAxisLabel('Y', '#33ff33')
  gizmoLabelZ = createAxisLabel('Z', '#3399ff')
  gizmoLabelX.position.set(2.5, 0, 0)
  gizmoLabelY.position.set(0, 2.5, 0)
  gizmoLabelZ.position.set(0, 0, 2.5)
  gizmoScene.add(gizmoLabelX)
  gizmoScene.add(gizmoLabelY)
  gizmoScene.add(gizmoLabelZ)
  // 中文标注
  gizmoLabelXc = createAxisLabelCN('排', '#ff3333')
  gizmoLabelYc = createAxisLabelCN('层', '#33ff33')
  gizmoLabelZc = createAxisLabelCN('列', '#3399ff')
  gizmoLabelXc.position.set(3.3, 0, 0)
  gizmoLabelYc.position.set(0, 3.3, 0)
  gizmoLabelZc.position.set(0, 0, 3.3)
  gizmoScene.add(gizmoLabelXc)
  gizmoScene.add(gizmoLabelYc)
  gizmoScene.add(gizmoLabelZc)
}

function renderGizmo() {
  if (!gizmoScene || !gizmoCamera || !gizmoRenderer || !camera) return
  // 让gizmo的朝向和主相机一致
  const q = camera.quaternion
  gizmoAxes.quaternion.copy(q)
  gizmoLabelX.quaternion.copy(q)
  gizmoLabelY.quaternion.copy(q)
  gizmoLabelZ.quaternion.copy(q)
  gizmoLabelXc.quaternion.copy(q)
  gizmoLabelYc.quaternion.copy(q)
  gizmoLabelZc.quaternion.copy(q)
  gizmoRenderer.render(gizmoScene, gizmoCamera)
}

onMounted(() => {
  initThree()
})

onBeforeUnmount(() => {
  renderer?.dispose()
  gizmoRenderer?.dispose()
  slotMeshes = []
})

watch(() => props.slots, () => {
  if (scene) renderSlots()
}, { deep: true })

// 外部定位支持
watch(() => props.externalSelectedSlot, (val) => {
  if (val) {
    selectedSlot.value = val
  }
})

// 高亮响应
watch(() => props.highlightSlots, () => {
  if (scene) renderSlots()
}, { deep: true })

function closeSlotInfo() {
  selectedSlot.value = null
  if (props.externalSelectedSlot) {
    emit('clear-external-selected')
  }
}
</script> 