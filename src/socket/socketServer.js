const { Server } = require('socket.io');

class SocketServer {
  constructor(httpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.NODE_ENV === 'production'
          ? ['https://yourdomain.com']
          : ['http://localhost:3000', 'http://localhost:5173'],
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    this.rooms = new Map(); // Store room data
    this.setupSocketHandlers();
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);
      
      socket.on('join_room', (roomId) => {
        console.log(`Socket ${socket.id} joining room ${roomId}`);
        socket.join(roomId);
        
        // Initialize room if it doesn't exist
        if (!this.rooms.has(roomId)) {
          this.rooms.set(roomId, {
            participants: new Set(),
            currentTrack: null,
            playbackState: {
              isPlaying: false,
              currentTime: 0
            },
            queue: [], // Initialize empty queue
            messages: [] // Initialize empty messages array
          });
        }

        const room = this.rooms.get(roomId);
        room.participants.add(socket.id);

        // Notify others in the room
        socket.to(roomId).emit('participant_joined', {
          id: socket.id,
          timestamp: Date.now()
        });

        // Send current room state to the new participant
        socket.emit('room_state', {
          participants: Array.from(room.participants),
          currentTrack: room.currentTrack,
          playbackState: room.playbackState,
          queue: room.queue, // Include queue in room state
          messages: room.messages // Include chat history
        });
      });

      socket.on('playback_state_changed', (state) => {
        this.handlePlaybackStateChange(socket, state);
      });

      socket.on('chat_message', (message) => {
        this.handleChatMessage(socket, message);
      });

      socket.on('add_to_queue', (track) => {
        this.handleQueueUpdate(socket, track);
      });

      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  handlePlaybackStateChange(socket, state) {
    const roomId = this.getRoomIdFromSocket(socket);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (room) {
      room.playbackState = state;
      // Broadcast to others in the room
      socket.to(roomId).emit('playback_state_changed', state);
    }
  }

  handleChatMessage(socket, message) {
    const roomId = this.getRoomIdFromSocket(socket);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (room) {
      const enrichedMessage = {
        ...message,
        senderId: socket.id,
        senderName: `User ${socket.id.slice(0, 6)}`,
        timestamp: Date.now()
      };
      
      // Store message in room history
      if (!room.messages) room.messages = [];
      room.messages.push(enrichedMessage);
      
      // Limit message history to last 100 messages
      if (room.messages.length > 100) {
        room.messages = room.messages.slice(-100);
      }
      
      this.io.to(roomId).emit('chat_message', enrichedMessage);
    }
  }

  handleQueueUpdate(socket, track) {
    const roomId = this.getRoomIdFromSocket(socket);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (room) {
      if (!room.queue) room.queue = [];
      room.queue.push({
        ...track,
        addedBy: socket.id,
        addedAt: Date.now()
      });
      this.io.to(roomId).emit('queue_updated', room.queue);
    }
  }

  handleDisconnect(socket) {
    const roomId = this.getRoomIdFromSocket(socket);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (room) {
      room.participants.delete(socket.id);
      
      // Notify others that participant left
      socket.to(roomId).emit('participant_left', socket.id);

      // Clean up empty rooms
      if (room.participants.size === 0) {
        this.rooms.delete(roomId);
      }
    }
  }

  getRoomIdFromSocket(socket) {
    return Array.from(socket.rooms)[1]; // First room is socket's own room
  }
}

module.exports = SocketServer;