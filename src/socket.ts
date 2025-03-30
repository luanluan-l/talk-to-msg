import { Server, ServerWebSocket } from "bun";

/**
 * WebSocket聊天服务器
 * 
 * 这个文件实现了一个基于WebSocket的聊天服务器，主要功能如下：
 * 
 * 1. 创建一个监听3055端口的WebSocket服务器
 * 2. 实现了基于频道(channel)的聊天系统，允许用户加入特定频道进行交流
 * 3. 主要功能包括：
 *    - 客户端连接管理
 *    - 频道加入机制
 *    - 消息广播系统
 *    - 用户加入/离开通知
 * 
 * 具体实现细节：
 * - 使用Map数据结构按频道存储客户端连接
 * - 处理CORS预检请求，确保跨域访问
 * - 提供WebSocket升级机制
 * - 实现消息处理逻辑，支持加入频道和发送消息两种主要操作
 * - 当用户加入或离开频道时，会通知同一频道的其他用户
 * - 在频道内发送消息时，会广播给频道内所有用户
 * 
 * 这是一个典型的实时通信服务器，专门用于支持基于频道的聊天功能，允许多个客户端通过WebSocket协议进行实时通信。
 */

// Store clients by channel
// 按频道存储客户端
const channels = new Map<string, Set<ServerWebSocket<any>>>();

function handleConnection(ws: ServerWebSocket<any>) {
  // Don't add to clients immediately - wait for channel join
  // 不立即添加到客户端列表 - 等待频道加入
  console.log("New client connected");

  // Send welcome message to the new client
  // 向新客户端发送欢迎消息
  ws.send(JSON.stringify({
    type: "system",
    message: "Please join a channel to start chatting",
  }));

  ws.close = () => {
    console.log("Client disconnected");

    // Remove client from their channel
    // 从频道中移除客户端
    channels.forEach((clients, channelName) => {
      if (clients.has(ws)) {
        clients.delete(ws);

        // Notify other clients in same channel
        // 通知同一频道中的其他客户端
        clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: "system",
              message: "A user has left the channel",
              channel: channelName
            }));
          }
        });
      }
    });
  };
}

const server = Bun.serve({
  port: 3055,
  fetch(req: Request, server: Server) {
    // Handle CORS preflight
    // 处理CORS预检请求
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    // Handle WebSocket upgrade
    // 处理WebSocket升级
    const success = server.upgrade(req, {
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });

    if (success) {
      return; // Upgraded to WebSocket // 已升级到WebSocket
    }

    // Return response for non-WebSocket requests
    // 返回非WebSocket请求的响应
    return new Response("WebSocket server running", {
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });
  },
  websocket: {
    open: handleConnection,
    message(ws: ServerWebSocket<any>, message: string | Buffer) {
      try {
        console.log("Received message from client:", message);
        const data = JSON.parse(message as string);

        if (data.type === "join") {
          const channelName = data.channel;
          if (!channelName || typeof channelName !== "string") {
            ws.send(JSON.stringify({
              type: "error",
              message: "Channel name is required"
            }));
            return;
          }

          // Create channel if it doesn't exist
          // 如果频道不存在，则创建
          if (!channels.has(channelName)) {
            channels.set(channelName, new Set());
          }

          // Add client to channel
          // 将客户端添加到频道
          const channelClients = channels.get(channelName)!;
          channelClients.add(ws);

          // Notify client they joined successfully
          // 通知客户端成功加入
          ws.send(JSON.stringify({
            type: "system",
            message: `Joined channel: ${channelName}`,
            channel: channelName
          }));

          console.log("Sending message to client:", data.id);

          ws.send(JSON.stringify({
            type: "system",
            message: {
              id: data.id,
              result: "Connected to channel: " + channelName,
            },
            channel: channelName
          }));

          // Notify other clients in channel
          // 通知频道中的其他客户端
          channelClients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: "system",
                message: "A new user has joined the channel",
                channel: channelName
              }));
            }
          });
          return;
        }

        // Handle regular messages
        // 处理普通消息
        if (data.type === "message") {
          const channelName = data.channel;
          if (!channelName || typeof channelName !== "string") {
            ws.send(JSON.stringify({
              type: "error",
              message: "Channel name is required"
            }));
            return;
          }

          const channelClients = channels.get(channelName);
          if (!channelClients || !channelClients.has(ws)) {
            ws.send(JSON.stringify({
              type: "error",
              message: "You must join the channel first"
            }));
            return;
          }

          // Broadcast to all clients in the channel
          // 向频道中的所有客户端广播
          channelClients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              console.log("Broadcasting message to client:", data.message);
              client.send(JSON.stringify({
                type: "broadcast",
                message: data.message,
                sender: client === ws ? "You" : "User",
                channel: channelName
              }));
            }
          });
        }
      } catch (err) {
        console.error("Error handling message:", err);
      }
    },
    close(ws: ServerWebSocket<any>) {
      // Remove client from their channel
      // 从频道中移除客户端
      channels.forEach((clients) => {
        clients.delete(ws);
      });
    }
  }
});

console.log(`WebSocket server running on port ${server.port}`);
