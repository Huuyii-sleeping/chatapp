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

  afterInit(server: Server) {
    console.log('websocket网关已经初始化');
  }

  handleConnection(client: Socket, ...args: any[]) {
    console.log('客户端连接', client.id);
  }
  handleDisconnect(client: Socket) {
    const user = this.users.get(client.id);
    if (user) {
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
    };
    this.server.to(user!.room).emit('message', message);
  } 

  @SubscribeMessage('increment')
  handleIncrement(client: Socket) {
    console.log('increment')
    this.count++;
    console.log(this.count)
    this.server.emit('countUpdate', this.count);
  }
}
