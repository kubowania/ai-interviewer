import { NextResponse } from 'next/server';
import { AgoraClient, Area } from 'agora-agents';

const client = new AgoraClient({
  area: Area.US,
  appId: process.env.NEXT_PUBLIC_AGORA_APP_ID,
  appCertificate: process.env.NEXT_AGORA_APP_CERTIFICATE,
});

export async function POST(req) {
  const { agentId } = await req.json();
  await client.stopAgent(agentId);
  return NextResponse.json({ stopped: true });
}
