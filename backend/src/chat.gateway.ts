import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

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

  afterInit(server: Server) {
    console.log('websocket网关已经初始化');
  }

  handleConnection(client: Socket, ...args: any[]) {
    console.log('客户端连接', client.id);
    // 广播新用户加入
    this.server.emit('message', {
      user: '系统',
      msg: '有新的用户加入聊天室',
      time: new Date().toLocaleTimeString(),
    });
  }
  handleDisconnect(client: Socket) {
    console.log('客户端断开', client.id);
    this.server.emit('message', {
      user: '系统',
      msg: '有用户离开聊天室',
      time: new Date().toLocaleTimeString(),
    });
  }
  @SubscribeMessage('sendMessage')
  handleMessage(client: Socket, payload: { user: string; msg: string }) {
    const message = {
      user: payload.user || '匿名',
      msg: payload.msg,
      time: new Date().toLocaleTimeString(),
    };
    this.server.emit('message', message);
  }
}
