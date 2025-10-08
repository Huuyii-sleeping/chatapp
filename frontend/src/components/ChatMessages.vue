<!-- src/components/ChatMessages.vue -->
<template>
  <div class="messages" ref="messagesContainer">
    <div
      v-for="(msg, index) in messages"
      :key="index"
      :class="['message', { 'private-msg': msg.type === 'private' }]"
    >
      <template v-if="msg.type === 'private'">
        <strong class="private-label">[私聊]</strong>
        <strong>
          [{{ msg.time }}] {{ msg.user }} →
          {{ msg.to === "me" ? "你" : msg.to }}:
        </strong>
        {{ msg.msg }}
      </template>
      <template v-if="msg.type === 'image'">
        <strong>[{{ msg.time }}] {{ msg.user }}:</strong>
        <div class="image-container">
          <img
            :src="msg.base64"
            :alt="msg.filename"
            @click="viewImage(msg.base64)"
          />
          <div class="image-filename">{{ msg.filename }}</div>
        </div>
      </template>
      <template v-else>
        <strong>[{{ msg.time }}] {{ msg.user }}:</strong> {{ msg.msg }}
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";

defineProps({
  messages: Array,
});

const messagesContainer = ref(null);

// 暴露 scrollToBottom 方法给父组件
const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

const viewImage = (base64) => {
  window.open(base64, "_blank");
};

defineExpose({ scrollToBottom });
</script>

<style scoped>
.message {
  margin-bottom: 12px;
  padding: 8px;
  border-radius: 4px;
  line-height: 1.4;
}

.image-msg {
  background: #f8f9fa;
  border-left: 3px solid #ff9800;
  margin-left: 10px;
}

.image-container {
  margin-top: 8px;
  max-width: 300px;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
}

.image-container img {
  width: 100%;
  height: auto;
  display: block;
}

.image-filename {
  padding: 5px;
  font-size: 12px;
  text-align: center;
  background: #f8f9fa;
  word-break: break-all;
}
.messages {
  flex: 1;
  padding: 15px;
  overflow-y: auto;
  background: white;
}

.message {
  margin-bottom: 12px;
  padding: 8px;
  border-radius: 4px;
  line-height: 1.4;
}

.private-msg {
  background: #f8f9fa;
  border-left: 3px solid #28a745;
  margin-left: 10px;
}

.private-label {
  color: #28a745;
  margin-right: 5px;
}
</style>
