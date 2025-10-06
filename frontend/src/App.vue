<!-- src/components/ChatRoom.vue -->
<template>
  <div class="chat-container">
    <h2>Socket.IO聊天室 (Vue + NestJS)</h2>

    <JoinRoomForm
      v-if="!joined"
      :username="username"
      :room="room"
      @join="joinRoom"
    />

    <div v-else class="chat-main">
      <ChatSidebar
        ref="sidebarComponent"
        :username="username"
        :currentRoom="currentRoom"
        :count="count"
        :online-users="onlineUsers"
        :private-chat-target="privateChatTarget"
        :socket="socket"
        @increment="increment"
        @start-private-chat="startPrivateChat"
      />

      <div class="chat-area">
        <div class="room-header">
          <span>
            当前房间:
            <strong>{{ currentRoom }}</strong>
          </span>
          <span v-if="isWriting">{{ isWriting }}正在输入</span>
          <button @click="leaveRoom" class="leave-btn">退出房间</button>
        </div>

        <ChatMessages ref="messagesComponent" :messages="messages" />

        <PrivateChatPanel
          :private-chat-target="privateChatTarget"
          :socket="socket"
          @send-private-message="sendPrivateMessage"
          @close-private-chat="() => (privateChatTarget = null)"
        />

        <PublicChatInput
          :socket="socket"
          @send-message="sendMessage"
          @publicMessage="isWritePublic"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted, nextTick } from "vue";
import { io } from "socket.io-client";
import JoinRoomForm from "./components/JoinRoomForm.vue";
import ChatSidebar from "./components/ChatSidebar.vue";
import ChatMessages from "./components/ChatMessages.vue";
import PrivateChatPanel from "./components/PrivateChatPanel.vue";
import PublicChatInput from "./components/PublicChatInput.vue";

const username = ref("");
const room = ref("general");
const messages = ref([]);
const joined = ref(false);
const currentRoom = ref("");
const socket = ref(null);
const count = ref(0);
const onlineUsers = ref([]);
const privateChatTarget = ref(null);
const messagesComponent = ref(null);
const isWriting = ref("");
const sidebarComponent = ref(null);

const joinRoom = ({ username: uname, room: rname }) => {
  if (socket.value) socket.value.disconnect();

  socket.value = io("http://localhost:3000");

  socket.value.on("connect", () => {
    console.log("连接成功，加入房间...");
    socket.value.emit("joinRoom", { username: uname, room: rname });
    socket.value.emit("requestUserList");
  });

  socket.value.on("joinedRoom", (data) => {
    joined.value = true;
    currentRoom.value = data.room;
    messages.value = [];
    messages.value.push({
      user: "系统",
      msg: `你已加入房间 "${data.room}"`,
      time: new Date().toLocaleTimeString(),
      type: "system",
    });
    // 请求历史消息（需后端实现）
    socket.value.emit("requestMessageHistory", data.room);
  });

  socket.value.on("newPoll", (pollData) => {
    sidebarComponent.value.getPollPanel().startPoll(pollData);
  });

  socket.value.on("voteUpdate", (votes) => {
    sidebarComponent.value.getPollPanel().updatePoll(votes);
  });

  socket.value.on("pollEnd", () => {
    sidebarComponent.value.getPollPanel().resetPoll();
  });

  socket.value.on("userListUpdate", (users) => {
    onlineUsers.value = users.filter((u) => u.socketId !== socket.value.id);
  });

  socket.value.on("messageHistory", (messageHistory) => {
    messages.value.push(...messageHistory);
    nextTick(() => messagesComponent.value?.scrollToBottom());
  });

  socket.value.on("countUpdate", (newCount) => {
    count.value = newCount;
  });

  socket.value.on("whoIsWrite", (username) => {
    isWriting.value = username;
    if (timer) stopTimer();
    startTimer();
  });

  socket.value.on("message", (data) => {
    messages.value.push({ ...data, type: "room" });
    nextTick(() => messagesComponent.value?.scrollToBottom());
  });

  socket.value.on("privateMessage", (data) => {
    messages.value.push({
      ...data,
      type: "private",
      to: data.to || "me",
    });
    nextTick(() => messagesComponent.value?.scrollToBottom());
  });

  socket.value.on("error", (err) => {
    alert("错误: " + err.msg);
  });
};

let timer;

const startTimer = () => {
  if (timer) stopTimer();
  timer = setTimeout(() => {
    isWriting.value = null;
  }, 1000);
};

const stopTimer = () => {
  if (!timer) return;
  clearTimeout(timer);
  timer = null;
};

const isWritePublic = (msg) => {
  socket.value.emit("isWritePublic");
};

const startPrivateChat = (user) => {
  privateChatTarget.value = user;
};

const sendPrivateMessage = (msg) => {
  if (!socket.value || !privateChatTarget.value) return;

  socket.value.emit("privateMessage", {
    to: privateChatTarget.value.socketId,
    msg: msg,
  });

  messages.value.push({
    user: username.value,
    to: privateChatTarget.value.username,
    msg: msg,
    time: new Date().toLocaleTimeString(),
    type: "private",
  });
  nextTick(() => messagesComponent.value?.scrollToBottom());
};

const sendMessage = (msg) => {
  if (!socket.value) return;
  socket.value.emit("sendMessage", { msg });
};

const leaveRoom = () => {
  if (socket.value) socket.value.disconnect();
  joined.value = false;
  messages.value = [];
  currentRoom.value = "";
  onlineUsers.value = [];
  privateChatTarget.value = null;
};

const increment = () => {
  if (socket.value) socket.value.emit("increment");
};

onUnmounted(() => {
  if (socket.value) socket.value.disconnect();
});
</script>

<style scoped>
.chat-container {
  max-width: 1200px;
  margin: 20px auto;
  padding: 20px;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
}

.chat-main {
  display: flex;
  gap: 20px;
  height: 600px;
}

.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  overflow: hidden;
}

.room-header {
  padding: 15px;
  background: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.leave-btn {
  padding: 6px 12px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.leave-btn:disabled {
  background: #6c757d;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .chat-main {
    flex-direction: column;
    height: auto;
  }
}
</style>
