const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// Store active rooms (consider using Redis for production)
const activeRooms = new Map();

// Create a new room
router.post('/', (req, res) => {
  const roomId = uuidv4();
  
  activeRooms.set(roomId, {
    id: roomId,
    createdAt: Date.now(),
    participants: new Set()
  });

  res.json({ roomId });
});

// Get room info - Fix the path to just /:roomId since /api/rooms is already prefixed
router.get('/:roomId', (req, res) => {  // Changed from /rooms/:roomId to /:roomId
  const { roomId } = req.params;
  const room = activeRooms.get(roomId);

  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  res.json({
    id: room.id,
    participantCount: room.participants.size,
    createdAt: room.createdAt
  });
});

module.exports = router;