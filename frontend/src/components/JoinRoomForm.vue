<!-- src/components/JoinRoomForm.vue -->
<template>
  <div class="join-form">
    <input
      v-model="localUsername"
      placeholder="昵称"
      @keyup.enter="handleSubmit"
    />
    <input
      v-model="localRoom"
      placeholder="房间名（如：room1）"
      @keyup.enter="handleSubmit"
    />
    <button @click="handleSubmit" :disabled="!canJoin">加入房间</button>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";

const props = defineProps({
  username: String,
  room: String,
});

const emit = defineEmits(["join"]);

const localUsername = ref(props.username);
const localRoom = ref(props.room);

const canJoin = computed(() => {
  return localUsername.value.trim() && localRoom.value.trim();
});

const handleSubmit = () => {
  if (canJoin.value) {
    emit("join", {
      username: localUsername.value.trim(),
      room: localRoom.value.trim(),
    });
  }
};
</script>

<style scoped>
.join-form {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
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
</style>
