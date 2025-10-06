<template>
  <div class="chat-container">
    <h2>Socket.IO 聊天室 (Vue + NestJS)</h2>

    <div class="input-section">
      <input
        v-model="username"
        placeholder="请输入昵称"
        @keyup.enter="joinChat"
        :disabled="joined"
      />
      <button @click="joinChat" :disabled="joined || !username.trim()">
        {{ joined ? "已加入" : "加入聊天" }}
      </button>
    </div>

    <div v-if="joined" class="chat-section">
      <div class="messages" ref="messagesContainer">
        <div v-for="(msg, index) in messages" :key="index" class="message">
          <strong>[{{ msg.time }}] {{ msg.user }}:</strong> {{ msg.msg }}
        </div>
      </div>

      <div class="send-section">
        <input
          v-model="newMessage"
          placeholder="输入消息..."
          @keyup.enter="sendMessage"
          :disabled="!socket"
        />
        <button @click="sendMessage" :disabled="!newMessage.trim()">
          发送
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { io } from "socket.io-client";
import { nextTick, onUnmounted, ref } from "vue";

const username = ref("");
const newMessage = ref("");
const messages = ref([]) as any;
const joined = ref(false);
const socket = ref(null) as any;
const messagesContainer = ref(null) as any;
const joinChat = () => {
  if (!username.value.trim()) {
    return;
  }
  socket.value = io("http://localhost:3000");

  socket.value.on("connect", () => {
    console.log("websocket连接成功");
    joined.value = true;
    messages.value.push({
      user: "系统",
      msg: "你已经加入聊天室",
      time: new Date().toLocaleTimeString(),
    });
  });

  socket.value.on("message", (data: any) => {
    messages.value.push(data);
    nextTick(() => {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    });
  });

  socket.value.on("disconnect", () => {
    console.log("websocket 断开连接");
  });
};

const sendMessage = () => {
  if (!newMessage.value.trim() || !socket.value) return;
  socket.value.emit("sendMessage", {
    user: username.value,
    msg: newMessage.value,
  });
  newMessage.value = "";
};
onUnmounted(() => {
  if (socket.value) {
    socket.value.disconnect();
  }
});
</script>

<style scoped>
.chat-container {
  max-width: 800px;
  margin: 20px auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}
.input-section,
.send-section {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}
input {
  flex: 1;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}
button {
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
button:disabled {
  background: #ccc;
  cursor: not-allowed;
}
.messages {
  height: 400px;
  border: 1px solid #ddd;
  padding: 10px;
  overflow-y: auto;
  background: #f9f9f9;
}
.message {
  margin-bottom: 8px;
  word-wrap: break-word;
}
</style>
