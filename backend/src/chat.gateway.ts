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
  private getOnlineList() {
    const arr = Array.from(this.users.values()).map((u) => ({
      socketId: u.socketId,
      username: u.username,
    }));
    console.log(arr);
    return arr;
  }

  afterInit(server: Server) {
    console.log('websocket网关已经初始化');
  }

  handleConnection(client: Socket, ...args: any[]) {
    console.log('客户端连接', client.id);
    client.emit('countUpdate', this.count);
    // 连接之后不立即发送请求等待前端发送请求
  }
  handleDisconnect(client: Socket) {
    const user = this.users.get(client.id);
    if (user) {
      this.server.emit('userListUpdate', this.getOnlineList());
      this.server.to(user.room).emit('message', {
        user: '系统',
        msg: `${user.username}离开了房间`,
        time: new Date().toLocaleTimeString(),
      });
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
    this.server.emit('messageHistory', this.messageHistory)
    this.server.emit('userListUpdate', this.getOnlineList());
    client.emit('joinedRoom', { room, username });
  }

  @SubscribeMessage('sendMessage')
  handleMessage(client: Socket, payload: { msg: string }) {
    const user = this.users.get(client.id);
    if (!user) {
      client.emit('error', { msg: '请先加入房间' });
    }
    const message = {
      user: user!.username || '匿名',
      msg: payload.msg,
      time: new Date().toLocaleTimeString(),
      type: 'room',
    };
    this.messageHistory.push(message);
    if (this.messageHistory.length > 50) this.messageHistory.shift();
    this.server.to(user!.room).emit('message', message);
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

  @SubscribeMessage('increment')
  handleIncrement(client: Socket) {
    console.log('increment');
    this.count++;
    console.log(this.count);
    this.server.emit('countUpdate', this.count);
  }
}
