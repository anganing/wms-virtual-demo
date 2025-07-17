<template>
  <div>
    <el-collapse v-model="collapseActive" style="margin-bottom: 12px;">
      <el-collapse-item title="库位初始化" name="init">
        <el-form :inline="true" @submit.prevent>
          <el-form-item label="排数">
            <el-input-number v-model="initRows" :min="1" :max="20" />
          </el-form-item>
          <el-form-item label="列数">
            <el-input-number v-model="initColumns" :min="1" :max="20" />
          </el-form-item>
          <el-form-item label="层数">
            <el-input-number v-model="initLevels" :min="1" :max="10" />
          </el-form-item>
          <el-button type="primary" @click="initSlots">生成库位</el-button>
          <el-button type="danger" @click="clearAllSlots">清空全部库位</el-button>
        </el-form>
      </el-collapse-item>
      <el-collapse-item title="单个库位编辑" name="edit">
        <el-form :inline="true" @submit.prevent>
          <el-form-item label="排">
            <el-input-number v-model="form.row" :min="1" :max="rows" />
          </el-form-item>
          <el-form-item label="列">
            <el-input-number v-model="form.column" :min="1" :max="columns" />
          </el-form-item>
          <el-form-item label="层">
            <el-input-number v-model="form.level" :min="1" :max="levels" />
          </el-form-item>
          <el-form-item label="物料名称">
            <el-input v-model="form.name" />
          </el-form-item>
          <el-form-item label="数量">
            <el-input-number v-model="form.qty" :min="1" />
          </el-form-item>
          <el-form-item label="托盘号">
            <el-input v-model="form.pallet" placeholder="可选" />
          </el-form-item>
          <el-form-item label="长(m)">
            <el-input-number v-model="form.length" :min="0.1" :step="0.1" />
          </el-form-item>
          <el-form-item label="宽(m)">
            <el-input-number v-model="form.width" :min="0.1" :step="0.1" />
          </el-form-item>
          <el-form-item label="高(m)">
            <el-input-number v-model="form.height" :min="0.1" :step="0.1" />
          </el-form-item>
          <el-form-item label="承重(kg)">
            <el-input-number v-model="form.maxLoad" :min="1" :step="10" />
          </el-form-item>
          <el-button type="primary" @click="updateSlot">更新库位</el-button>
          <el-button @click="clearSlot">清空库位</el-button>
        </el-form>
      </el-collapse-item>
      <el-collapse-item title="库位定位" name="locate">
        <el-form :inline="true" @submit.prevent>
          <el-form-item label="排">
            <el-input-number v-model="locateForm.row" :min="1" :max="rows" />
          </el-form-item>
          <el-form-item label="列">
            <el-input-number v-model="locateForm.column" :min="1" :max="columns" />
          </el-form-item>
          <el-form-item label="层">
            <el-input-number v-model="locateForm.level" :min="1" :max="levels" />
          </el-form-item>
          <el-form-item label="托盘号">
            <el-input v-model="locateForm.pallet" placeholder="可选，支持直接输托盘号定位" />
          </el-form-item>
          <el-form-item label="物料名称">
            <el-input v-model="locateForm.name" placeholder="可选，支持物料名称定位" />
          </el-form-item>
          <el-button type="primary" @click="locateSlot">定位并查看库位</el-button>
        </el-form>
      </el-collapse-item>
    </el-collapse>
    <el-button type="info" @click="reset3DView" style="margin-bottom: 12px;">重置视角</el-button>
    <el-dialog v-model="locateDialogVisible" title="选择库位" width="350px" @close="locateDialogVisible=false">
      <el-table :data="locateResultSlots" style="width: 100%" @row-click="chooseLocatedSlot">
        <el-table-column prop="row" label="排" width="50" />
        <el-table-column prop="column" label="列" width="50" />
        <el-table-column prop="level" label="层" width="50" />
        <el-table-column prop="status" label="状态" :formatter="statusFormat" />
      </el-table>
    </el-dialog>
    <Warehouse3D ref="warehouse3d" :slots="slots" :rows="rows" :columns="columns" :levels="levels" :external-selected-slot="externalSelectedSlot" :highlight-slots="highlightSlots" @clear-external-selected="externalSelectedSlot = null" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import Warehouse3D from './components/Warehouse3D.vue'
import { ElMessage } from 'element-plus'

const collapseActive = ref(['locate'])
const initRows = ref(3)
const initColumns = ref(4)
const initLevels = ref(2)
const slots = ref([])

const rows = computed(() => initRows.value)
const columns = computed(() => initColumns.value)
const levels = computed(() => initLevels.value)

function initSlots() {
  slots.value = []
  for (let l = 0; l < initLevels.value; l++) {
    for (let r = 0; r < initRows.value; r++) {
      for (let c = 0; c < initColumns.value; c++) {
        slots.value.push({
          row: r + 1,
          column: c + 1,
          level: l + 1,
          status: 'empty',
          material: null,
          length: 1.2,
          width: 1.2,
          height: 1.2,
          maxLoad: 1000
        })
      }
    }
  }
}

const form = ref({ row: 1, column: 1, level: 1, name: '', qty: 1, pallet: '', length: 1.2, width: 1.2, height: 1.2, maxLoad: 1000 })
const warehouse3d = ref(null)

function updateSlot() {
  const idx = slots.value.findIndex(
    s => s.row === form.value.row && s.column === form.value.column && s.level === form.value.level
  )
  if (idx !== -1) {
    slots.value[idx].material = {
      name: form.value.name,
      qty: form.value.qty,
      ...(form.value.pallet ? { pallet: form.value.pallet } : {})
    }
    slots.value[idx].status = 'occupied'
    slots.value[idx].length = form.value.length
    slots.value[idx].width = form.value.width
    slots.value[idx].height = form.value.height
    slots.value[idx].maxLoad = form.value.maxLoad
  }
}

function clearSlot() {
  const idx = slots.value.findIndex(
    s => s.row === form.value.row && s.column === form.value.column && s.level === form.value.level
  )
  if (idx !== -1) {
    slots.value[idx].material = null
    slots.value[idx].status = 'empty'
  }
}

function clearAllSlots() {
  slots.value.forEach(slot => {
    slot.material = null
    slot.status = 'empty'
  })
}

function reset3DView() {
  warehouse3d.value?.resetView()
}

// 定位功能
const locateForm = ref({ row: null, column: null, level: null, pallet: '', name: '' })
const externalSelectedSlot = ref(null)
const highlightSlots = ref([])
const locateDialogVisible = ref(false)
const locateResultSlots = ref([])
function locateSlot() {
  let slotsFound = []
  if (locateForm.value.pallet) {
    slotsFound = slots.value.filter(s => s.material && s.material.pallet === locateForm.value.pallet)
  } else if (locateForm.value.name) {
    const keyword = locateForm.value.name.trim().toLowerCase()
    slotsFound = slots.value.filter(s => s.material && s.material.name && s.material.name.toLowerCase().includes(keyword))
  } else if (locateForm.value.row && locateForm.value.column && locateForm.value.level) {
    slotsFound = slots.value.filter(s => s.row === locateForm.value.row && s.column === locateForm.value.column && s.level === locateForm.value.level)
  }
  if (slotsFound.length === 1) {
    externalSelectedSlot.value = slotsFound[0]
    highlightSlots.value = [slotsFound[0]]
  } else if (slotsFound.length > 1) {
    locateResultSlots.value = slotsFound
    locateDialogVisible.value = true
    highlightSlots.value = slotsFound
  } else {
    ElMessage.warning('未找到对应库位')
    highlightSlots.value = []
  }
}
function chooseLocatedSlot(slot) {
  externalSelectedSlot.value = slot
  locateDialogVisible.value = false
}
function statusFormat(row) {
  const map = { empty: '空库位', occupied: '已占用', reserved: '预留' }
  return map[row.status] || row.status
}
// 初始化一次默认库位
initSlots()
</script> 