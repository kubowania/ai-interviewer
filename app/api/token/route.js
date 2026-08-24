import { NextResponse } from 'next/server';
import { RtcTokenBuilder, RtcRole, RtmTokenBuilder } from 'agora-token';

export async function POST(req) {
  const { channel, uid } = await req.json();
  const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
  const cert = process.env.NEXT_AGORA_APP_CERTIFICATE;
  const expire = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

  const rtcToken = RtcTokenBuilder.buildTokenWithUid(
    appId, cert, channel, uid, RtcRole.PUBLISHER, expire, expire
  );

  const rtmToken = RtmTokenBuilder.buildToken(appId, cert, String(uid), expire);
  return NextResponse.json({ rtcToken, rtmToken });
}