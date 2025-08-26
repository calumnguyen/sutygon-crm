import { NextRequest, NextResponse } from 'next/server';
import { pusherServer } from '@/lib/pusher';

export async function POST(request: NextRequest) {
  try {
    const { socket_id, channel_name } = await request.json();

    // For presence channels, we need to provide user info
    // Since we don't have user info in the request, we'll use a default structure
    // In a real app, you'd get this from the session/token
    const authResponse = pusherServer.authorizeChannel(socket_id, channel_name, {
      user_id: 'user_' + Date.now(), // Generate a unique user ID
      user_info: {
        name: 'User',
        email: 'user@example.com',
      },
    });

    return NextResponse.json(authResponse);
  } catch (error) {
    console.error('Pusher auth error:', error);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
}
