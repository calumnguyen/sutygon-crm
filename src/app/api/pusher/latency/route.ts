import { NextRequest, NextResponse } from 'next/server';
import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, fromUserId, targetUserId, timestamp } = body;

    console.log('🔍 Pusher latency API received:', { type, fromUserId, targetUserId, timestamp });

    if (!type || !fromUserId || !targetUserId || !timestamp) {
      console.log('🔍 Missing required fields:', { type, fromUserId, targetUserId, timestamp });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Trigger the event to the latency-tracking channel
    console.log('🔍 Triggering Pusher event:', type, { fromUserId, targetUserId, timestamp });
    await pusher.trigger('latency-tracking', type, {
      fromUserId,
      targetUserId,
      timestamp,
    });

    console.log('🔍 Pusher event triggered successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('🔍 Error handling latency message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
