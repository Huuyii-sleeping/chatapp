<template>
  <div class="image-uploader">
    <h4>图片共享 📷</h4>

    <!-- 上传区域 -->
    <div
      class="upload-area"
      @dragover.prevent="onDragOver"
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
      :class="{ dragging: isDragging }"
    >
      <div v-if="!isUploading">
        <p>拖拽图片到这里，或</p>
        <label class="upload-btn">
          <input
            type="file"
            accept="image/*"
            @change="handleFileSelect"
            :disabled="isUploading"
          />
          点击选择图片
        </label>
      </div>
      <div v-else class="uploading">
        <div class="spinner"></div>
        正在上传...
      </div>
    </div>

    <!-- 上传历史 -->
    <div v-if="uploadedImages.length > 0" class="image-history">
      <h5>最近上传</h5>
      <div class="image-list">
        <div
          v-for="(img, index) in uploadedImages"
          :key="index"
          class="image-item"
        >
          <img :src="img.base64" :alt="img.filename" @click="viewImage(img)" />
          <div class="image-info">{{ img.filename }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const props = defineProps({
  socket: Object,
  currentRoom: String,
  username: String,
});

const emit = defineEmits(["imageUploaded"]);
const isDragging = ref(false);
const isUploading = ref(false);
const uploadedImages = ref([]);
const onDragOver = () => {
  isDragging.value = true;
};
const onDragLeave = () => {
  isDragging.value = false;
};
const onDrop = (event) => {
  isDragging.value = false;
  const files = event.dataTransfer.files;
  if (files.length > 0) {
    handleFile(files[0]);
  }
};

// 文件选择处理
const handleFileSelect = (event) => {
  const file = event.target.files[0];
  if (file) {
    handleFile(file);
  }
};

const handleFile = async (file) => {
  if (!props.socket || !props.currentRoom) return;
  isUploading.value = true;
  try {
    const base64 = await readFileAsBase64(file);
    props.socket.emit("uploadImage", {
      room: props.currentRoom,
      base64,
      filename: file.name,
    });
    uploadedImages.value.unshift({
      filename: file.name,
      base64,
      timestamp: Date.now(),
    });
    emit("imageUploaded", { filename: file.name, base64 });
  } catch (error) {
    console.error("上传失败", error);
    alert("上传失败，请重试");
  } finally {
    isUploading.value = false;
  }
};

const readFileAsBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
const viewImage = (img) => {
  window.open(img.base64, "_blank");
};
</script>

<style scoped>
.image-uploader {
  padding: 15px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #f9f9f9;
  margin-top: 20px;
}

.image-uploader h4 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  display: flex;
  align-items: center;
  gap: 8px;
}

.upload-area {
  border: 2px dashed #ccc;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.upload-area.dragging {
  border-color: #007bff;
  background: #e3f2fd;
}

.upload-area p {
  margin: 0 0 10px 0;
  color: #666;
}

.upload-btn {
  display: inline-block;
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.upload-btn input[type="file"] {
  position: absolute;
  opacity: 0;
  width: 100px;
  height: 30px;
  cursor: pointer;
  z-index: 10;
}

.uploading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #666;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.image-history {
  margin-top: 20px;
}

.image-history h5 {
  margin: 0 0 10px 0;
  color: #495057;
}

.image-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.image-item {
  width: 100px;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s;
}

.image-item:hover {
  transform: scale(1.05);
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

.image-item img {
  width: 100%;
  height: 80px;
  object-fit: cover;
}

.image-info {
  padding: 5px;
  font-size: 12px;
  text-align: center;
  background: #f8f9fa;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
