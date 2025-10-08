<!-- src/components/Whiteboard.vue -->
<template>
  <div class="whiteboard-container">
    <h4>协同白板 🖌️</h4>

    <!-- 工具栏 -->
    <div class="toolbar">
      <button
        @click="setTool('pen')"
        :class="{ active: currentTool === 'pen' }"
      >
        ✏️ 画笔
      </button>
      <button
        @click="setTool('eraser')"
        :class="{ active: currentTool === 'eraser' }"
      >
        🧽 橡皮
      </button>
      <button
        @click="setTool('clear')"
        :class="{ active: currentTool === 'clear' }"
      >
        🗑️ 清空
      </button>
      <input
        v-model="currentColor"
        type="color"
        @change="updateColor"
        title="选择颜色"
      />
      <input
        v-model="lineWidth"
        type="range"
        min="1"
        max="20"
        @input="updateLineWidth"
        title="线条粗细"
      />
      <span>{{ lineWidth }}px</span>
    </div>

    <!-- 画布 -->
    <canvas
      ref="canvas"
      class="canvas"
      @mousedown="startDrawing"
      @mousemove="draw"
      @mouseup="stopDrawing"
      @mouseleave="stopDrawing"
      @touchstart.prevent="startDrawingTouch"
      @touchmove.prevent="drawTouch"
      @touchend.prevent="stopDrawing"
    ></canvas>

    <!-- 操作统计 -->
    <div class="stats">
      <span>操作数: {{ opCount }}</span>
      <span>当前工具: {{ currentTool }}</span>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";

const props = defineProps({
  socket: Object,
  currentRoom: String,
  username: String,
});

const emit = defineEmits(["operationSent"]);

const canvas = ref(null);
const ctx = ref(null);
const isDrawing = ref(false);
const startX = ref(0);
const startY = ref(0);
const currentTool = ref("pen");
const currentColor = ref("#000000");
const lineWidth = ref(2);
const opCount = ref(0);

let sequenceId = 0;

// canvas init
onMounted(() => {
  const c = canvas.value;
  ctx.value = c.getContext("2d");
  ctx.value.lineCap = "round";
  ctx.value.lineJoin = "round";
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  // 设置默认样式
  ctx.value.strokeStyle = currentColor.value;
  ctx.value.lineWidth = lineWidth.value;

  // 监听服务器操作 - 修复事件名称大小写
  props.socket?.on("drawOp", handleRemoteOperation);
});

const resizeCanvas = () => {
  const c = canvas.value;
  // 修复：使用 clientWidth/clientHeight 而不是 lineWidth/lineHeight
  c.width = c.clientWidth;
  c.height = c.clientHeight;
};

const setTool = (tool) => {
  currentTool.value = tool;
  if (tool === "eraser") {
    ctx.value.strokeStyle = "#ffffff";
    ctx.value.lineWidth = 10;
  } else if (tool === "pen") {
    ctx.value.strokeStyle = currentColor.value;
    ctx.value.lineWidth = lineWidth.value;
  }
};

const updateColor = () => {
  ctx.value.strokeStyle = currentColor.value;
  if (currentTool.value === "pen") {
    ctx.value.lineWidth = lineWidth.value;
  }
};

const updateLineWidth = () => {
  ctx.value.lineWidth = lineWidth.value;
  if (currentTool.value === "pen") {
    ctx.value.strokeStyle = currentColor.value;
  }
};

// 绘图逻辑
const startDrawing = (e) => {
  if (currentTool.value === "clear") {
    clearCanvas();
    return;
  }
  isDrawing.value = true;
  startX.value = e.offsetX;
  startY.value = e.offsetY;
};

const draw = (e) => {
  if (!isDrawing.value || currentTool.value == "clear") return;
  const endX = e.offsetX;
  const endY = e.offsetY;

  ctx.value.beginPath();
  ctx.value.moveTo(startX.value, startY.value);
  ctx.value.lineTo(endX, endY);
  ctx.value.stroke();

  sendOperation({
    type: "line",
    x1: startX.value,
    y1: startY.value,
    x2: endX,
    y2: endY,
    color: currentColor.value,
    lineWidth: lineWidth.value, // 添加 lineWidth
    sequenceId: ++sequenceId,
    timestamp: Date.now(),
  });

  startX.value = endX;
  startY.value = endY;
};

const stopDrawing = () => {
  isDrawing.value = false;
};

// 触摸屏支持
const startDrawingTouch = (e) => {
  const touch = e.touches[0];
  const rect = canvas.value.getBoundingClientRect();
  startX.value = touch.clientX - rect.left;
  // 修复：拼写错误 clentY → clientY
  startY.value = touch.clientY - rect.top;
  isDrawing.value = true;
};

const drawTouch = (e) => {
  if (!isDrawing.value) return;

  const touch = e.touches[0];
  const rect = canvas.value.getBoundingClientRect();
  const endX = touch.clientX - rect.left;
  const endY = touch.clientY - rect.top;

  ctx.value.beginPath();
  ctx.value.moveTo(startX.value, startY.value);
  ctx.value.lineTo(endX, endY);
  ctx.value.stroke();

  sendOperation({
    type: "line",
    x1: startX.value,
    y1: startY.value,
    x2: endX,
    y2: endY,
    color: currentColor.value,
    lineWidth: lineWidth.value,
    sequenceId: ++sequenceId,
    timestamp: Date.now(),
  });

  startX.value = endX;
  startY.value = endY;
};

const clearCanvas = () => {
  ctx.value.clearRect(0, 0, canvas.value.width, canvas.value.height);
  sendOperation({
    type: "clear",
    sequenceId: ++sequenceId,
    timestamp: Date.now(),
  });
};

const sendOperation = (op) => {
  if (!props.socket || !props.currentRoom) return;

  op.room = props.currentRoom;
  op.user = props.username;

  props.socket.emit("drawOp", op);
  opCount.value++;
  emit("operationSent", op);
};

const handleRemoteOperation = (op) => {
  if (!ctx.value) return;

  if (op.type === "line") {
    // 修复：正确调用 Canvas API 方法
    ctx.value.beginPath();
    ctx.value.moveTo(op.x1, op.y1);
    ctx.value.lineTo(op.x2, op.y2);
    ctx.value.strokeStyle = op.color;
    ctx.value.lineWidth = op.lineWidth || 2; // 添加默认值
    ctx.value.stroke();
  } else if (op.type === "clear") {
    ctx.value.clearRect(0, 0, canvas.value.width, canvas.value.height);
  }
};

defineExpose({
  clearCanvas,
});
</script>

<style scoped>
.whiteboard-container {
  padding: 15px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #f9f9f9;
  margin-top: 20px;
}

.toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.toolbar button {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  background: #f0f0f0;
}

.toolbar button.active {
  background: #007bff;
  color: white;
}

.toolbar input[type="color"] {
  width: 30px;
  height: 30px;
  border: none;
  cursor: pointer;
}

.toolbar input[type="range"] {
  width: 100px;
}

.canvas {
  width: 100%;
  height: 300px;
  border: 1px solid #ddd;
  background: white;
  cursor: crosshair;
  touch-action: none;
}

.stats {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  font-size: 12px;
  color: #666;
}
</style>
