<template>
  <div class="send-section">
    <input
      v-model="message"
      placeholder="输入公聊消息..."
      @keyup.enter="handleSend"
      :disabled="!socket"
    />
    <button @click="handleSend" :disabled="!message.trim()" class="send-btn">
      发送
    </button>
  </div>
</template>

<script setup>
import { ref, watch } from "vue";

const props = defineProps({
  socket: Object,
});

const emit = defineEmits(["sendMessage", "publicMessage"]);

const message = ref("");

const handleSend = () => {
  if (message.value.trim() && props.socket) {
    emit("sendMessage", message.value);
    message.value = "";
  }
};
watch(message, () => {
  emit("publicMessage", message.value);
});
</script>

<style scoped>
.send-section {
  padding: 15px;
  border-top: 1px solid #dee2e6;
  background: #f8f9fa;
  display: flex;
  gap: 10px;
}

input {
  flex: 1;
  padding: 10px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
}

.send-btn {
  padding: 10px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.send-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}
</style>
