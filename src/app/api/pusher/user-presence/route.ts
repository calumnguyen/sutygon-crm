import { NextRequest, NextResponse } from 'next/server';
import { pusherServer } from '@/lib/pusher';

// In-memory storage for online users (in production, use Redis or database)
let onlineUsers: Array<{
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  deviceType: string;
  location: string;
  browser: string;
  joinedAt: Date;
}> = [];

export async function POST(request: NextRequest) {
  try {
    const { action, user } = await request.json();
    console.log('Pusher user-presence API called:', { action, user });

    if (action === 'join') {
      // Add user to online list
      const existingUserIndex = onlineUsers.findIndex((u) => u.id === user.id);
      if (existingUserIndex === -1) {
        onlineUsers.push({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          deviceType: user.deviceType,
          location: user.location,
          browser: user.browser,
          joinedAt: new Date(),
        });
        console.log('Added user to online list:', user.name);
      }

      // Broadcast that user joined
      console.log('Broadcasting user-joined event for:', user.name);
      await pusherServer.trigger('online-users', 'user-joined', {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        deviceType: user.deviceType,
        location: user.location,
        browser: user.browser,
      });
      console.log('Successfully broadcasted user-joined event');
    } else if (action === 'leave') {
      // Remove user from online list
      onlineUsers = onlineUsers.filter((u) => u.id !== user.id);
      console.log('Removed user from online list:', user.id);

      // Broadcast that user left
      console.log('Broadcasting user-left event for:', user.id);
      await pusherServer.trigger('online-users', 'user-left', {
        id: user.id,
      });
      console.log('Successfully broadcasted user-left event');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Pusher user presence error:', error);
    return NextResponse.json({ error: 'Failed to update presence' }, { status: 500 });
  }
}

export async function GET() {
  // Remove users who haven't been active for more than 5 minutes
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  onlineUsers = onlineUsers.filter((user) => user.joinedAt > fiveMinutesAgo);

  console.log('GET /api/pusher/user-presence - returning', onlineUsers.length, 'users');
  return NextResponse.json(onlineUsers);
}
