import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

interface User {
  socketId: string;
  username: string;
  room: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private users: Map<String, User> = new Map();
  private count: number = 0;
  private messageHistory: any[] = [];
  // 存储消息的已读状态
  private readStatus: Map<string, Set<string>> = new Map();
  // 存储离线用户未读消息
  private offlineUnread: Map<string, string[]> = new Map();
  private offlineUserRooms: Map<string, string> = new Map();
  private messageMetadata: Map<
    string,
    { sender: string; room: string; senderSocketId: string }
  > = new Map();
  private polls: Map<
    string,
    {
      question: string;
      options: string[];
      votes: number[];
      creator: string;
    }
  > = new Map();
  private getOnlineList() {
    const arr = Array.from(this.users.values()).map((u) => ({
      socketId: u.socketId,
      username: u.username,
    }));
    return arr;
  }
  private boardcastReadRecept(msgId: string, reader: string) {
    const msgMeta = this.messageMetadata.get(msgId);
    if (msgMeta) {
      this.server.to(msgMeta.senderSocketId).emit('messageRead', {
        msgId,
        reader,
        time: new Date().toLocaleTimeString(),
      });
    }
  }

  afterInit(server: Server) {
    console.log('websocket网关已经初始化');
  }

  handleConnection(client: Socket, ...args: any[]) {
    console.log('客户端连接', client.id);
    client.emit('countUpdate', this.count);
    const userRoom = this.offlineUserRooms.get(client.id);
    const unreadMsgs = this.offlineUnread.get(client.id) || [];
    if (unreadMsgs.length > 0) {
      unreadMsgs.forEach((msgId) => {
        this.handleReadRectipt(client, {
          msgId,
          room: userRoom as string,
        });
      });
      this.offlineUnread.delete(client.id);
      this.offlineUserRooms.delete(client.id);
    }
  }

  handleDisconnect(client: Socket) {
    const user = this.users.get(client.id);
    if (user) {
      this.offlineUserRooms.set(client.id, user.room);
      this.server.emit('userListUpdate', this.getOnlineList());
      this.server.to(user.room).emit('message', {
        user: '系统',
        msg: `${user.username}离开了房间`,
        time: new Date().toLocaleTimeString(),
      });
      this.offlineUnread.set(client.id, []);
      this.users.delete(client.id);
    }
    console.log('客户端断开', client.id);
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(client: Socket, payload: { username: string; room: string }) {
    const { username, room } = payload;
    const oldUser = this.users.get(client.id);
    if (oldUser) client.leave(oldUser.room);
    client.join(room);
    this.users.set(client.id, { socketId: client.id, username, room });

    // 通知当前房间 新用户加入
    this.server.to(room).emit('message', {
      user: '系统',
      msg: `${username} 加入了房间`,
      time: new Date().toLocaleTimeString(),
    });
    this.server.emit('messageHistory', this.messageHistory);
    this.server.emit('userListUpdate', this.getOnlineList());
    client.emit('joinedRoom', { room, username });
  }

  @SubscribeMessage('sendMessage')
  handleMessage(
    client: Socket,
    payload: { msg: string; msgId: string; room: string },
  ) {
    const user = this.users.get(client.id);
    if (!user) {
      client.emit('error', { msg: '请先加入房间' });
    }
    const message = {
      user: user!.username || '匿名',
      msg: payload.msg,
      msgId: payload.msgId,
      room: user?.room,
      time: new Date().toLocaleTimeString(),
      type: 'room',
    };
    this.messageMetadata.set(payload.msgId, {
      sender: user!.username,
      room: user!.room,
      senderSocketId: client.id,
    });
    this.readStatus.set(payload.msgId, new Set());
    this.messageHistory.push(message);
    if (this.messageHistory.length > 50) this.messageHistory.shift();
    this.server.to(user!.room).emit('message', message);
  }

  @SubscribeMessage('readReceipt')
  handleReadRectipt(client: Socket, payload: { msgId: string; room: string }) {
    const user = this.users.get(client.id);
    if (!user || user.room !== payload.room) {
      client.emit('error', { msg: '不在当前的房间' });
      return;
    }
    // set
    const readers = this.readStatus.get(payload.msgId);
    if (readers) {
      readers.add(user.username);
      this.boardcastReadRecept(payload.msgId, user.username);
    }
  }

  @SubscribeMessage('requestUserList')
  handleRequestUserList(client: Socket) {
    client.emit('userListUpdate', this.getOnlineList());
  }

  @SubscribeMessage('privateMessage')
  handlePrivateMessage(client: Socket, payload: { to: string; msg: string }) {
    const fromUser = this.users.get(client.id);
    const toUser = this.users.get(payload.to);
    if (!fromUser) {
      client.emit('error', { msg: '你还没有登录' });
      return;
    }
    if (!toUser) {
      client.emit('error', { msg: '目标用户不在线' });
      return;
    }
    const message = {
      user: fromUser,
      to: toUser.username,
      msg: payload.msg,
      time: new Date().toLocaleTimeString(),
      type: 'private',
    };
    this.server.to(payload.to).emit('privateMessage', message);
    client.emit('privateMessage', { ...message, to: 'me' });
  }

  @SubscribeMessage('isWritePublic')
  handleIsWritePublic(client: Socket) {
    const user = this.users.get(client.id);
    this.server.to(user!.room).emit('whoIsWrite', user?.username);
  }

  @SubscribeMessage('increment')
  handleIncrement(client: Socket) {
    this.count++;
    this.server.emit('countUpdate', this.count);
  }

  @SubscribeMessage('createPoll')
  handleCreatePoll(
    client: Socket,
    payload: { room: string; question: string; options: string[] },
  ) {
    const user = this.users.get(client.id);
    console.log(user);
    if (!user || user.room !== payload.room) {
      client.emit('error', { msg: '无法在当前房间创建投票' });
      return;
    }

    const poll = {
      question: payload.question,
      options: payload.options,
      votes: new Array(payload.options.length).fill(0),
      creator: user.username,
    };
    this.polls.set(payload.room, poll);
    this.server.to(payload.room).emit('newPoll', {
      ...poll,
      creator: user.username,
    });
  }

  @SubscribeMessage('submitVote')
  handleSubmitVote(
    client: Socket,
    payload: { room: string; optionIndex: number },
  ) {
    const user = this.users.get(client.id);
    const poll = this.polls.get(payload.room);
    console.log(user, poll);

    if (
      !user ||
      !poll ||
      payload.optionIndex < 0 ||
      payload.optionIndex >= poll.votes.length
    ) {
      client.emit('error', { msg: '无效的投票' });
      return;
    }

    poll.votes[payload.optionIndex]++;
    this.polls.set(payload.room, poll);
    this.server.to(payload.room).emit('voteUpdate', poll.votes);
  }

  @SubscribeMessage('endPoll')
  handleEndPoll(client: Socket, payload: { room: string }) {
    const user = this.users.get(client.id);
    const poll = this.polls.get(payload.room);
    if (!user || !poll || poll.creator !== user.username) {
      client.emit('error', { msg: '只有创建者能结束投票' });
      return;
    }

    this.polls.delete(payload.room);
    this.server.to(payload.room).emit('pollEnded');
  }

  @SubscribeMessage('uploadImage')
  handleUploadImage(
    client: Socket,
    payload: { room: string; base64: string; filename: string },
  ) {
    const user = this.users.get(client.id);
    if (!user || user.room !== payload.room) {
      client.emit('error', { msg: '不在当前的房间' });
    }
    if (payload.base64.length > 1e6) {
      client.emit('error', { msg: '上传的文件太大' });
    }

    this.server.to(payload.room).emit('imageMessage', {
      user: user?.username,
      filename: payload.filename,
      base64: payload.base64,
      time: new Date().toLocaleTimeString(),
      type: 'image',
    });
  }

  @SubscribeMessage('drawOp')
  handleDrawop(client: Socket, payload: any) {
    const user = this.users.get(client.id);
    if (!user || user.room !== payload.room) {
      client.emit('error', { msg: '不在当前的房间' });
      return;
    }

    if (!['line', 'clear'].includes(payload.type)) {
      client.emit('error', { msg: '无效的操作类型' });
      return;
    }

    this.server.to(payload.room).emit('drawOp', payload);
  }
}
