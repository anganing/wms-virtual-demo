<template>
  <el-dialog :model-value="true" title="库位信息" width="350px" @close="$emit('close')">
    <div>
      <h4>库位属性</h4>
      <el-descriptions :column="2" border size="small">
        <el-descriptions-item label="排">{{ slot.row }}</el-descriptions-item>
        <el-descriptions-item label="列">{{ slot.column }}</el-descriptions-item>
        <el-descriptions-item label="层">{{ slot.level }}</el-descriptions-item>
        <el-descriptions-item label="长(m)">{{ slot.length }}</el-descriptions-item>
        <el-descriptions-item label="宽(m)">{{ slot.width }}</el-descriptions-item>
        <el-descriptions-item label="高(m)">{{ slot.height }}</el-descriptions-item>
        <el-descriptions-item label="承重(kg)">{{ slot.maxLoad }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ statusText[slot.status] }}</el-descriptions-item>
      </el-descriptions>
      <h4 style="margin-top:16px;">物料信息</h4>
      <div v-if="slot.material">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="物料名称">{{ slot.material.name }}</el-descriptions-item>
          <el-descriptions-item label="数量">{{ slot.material.qty }}</el-descriptions-item>
          <el-descriptions-item label="托盘号" v-if="slot.material.pallet">{{ slot.material.pallet }}</el-descriptions-item>
        </el-descriptions>
      </div>
      <div v-else style="color: #888;">无物料</div>
    </div>
    <template #footer>
      <el-button @click="$emit('close')">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
const props = defineProps(['slot'])
const statusText = {
  empty: '空库位',
  occupied: '已占用',
  reserved: '预留'
}
</script> 