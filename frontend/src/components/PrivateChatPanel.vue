<!-- src/components/PrivateChatPanel.vue -->
<template>
  <div v-if="privateChatTarget" class="private-chat-section">
    <div class="private-header">
      💬 正在与 <strong>{{ privateChatTarget.username }}</strong> 私聊
      <button @click="onClose" class="close-private-btn">×</button>
    </div>
    <div class="private-input">
      <input
        v-model="message"
        placeholder="输入私聊消息..."
        @keyup.enter="handleSend"
        :disabled="!socket"
      />
      <button
        @click="handleSend"
        :disabled="!message.trim()"
        class="send-private-btn"
      >
        发送
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";

const props = defineProps({
  privateChatTarget: Object,
  socket: Object,
});

const emit = defineEmits(["sendPrivateMessage", "closePrivateChat"]);

const message = ref("");

const handleSend = () => {
  if (message.value.trim() && props.socket && props.privateChatTarget) {
    emit("sendPrivateMessage", message.value);
    message.value = "";
  }
};

const onClose = () => emit("closePrivateChat");
</script>

<style scoped>
.private-chat-section {
  padding: 15px;
  border-top: 1px solid #dee2e6;
  background: #f8fff8;
}

.private-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  font-weight: bold;
  color: #28a745;
}

.close-private-btn {
  background: none;
  border: none;
  font-size: 1.5em;
  cursor: pointer;
  color: #6c757d;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.private-input {
  display: flex;
  gap: 10px;
}

.send-private-btn {
  padding: 10px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.send-private-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}
</style>
