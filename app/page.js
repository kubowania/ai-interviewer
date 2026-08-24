'use client';

import { useState } from 'react';

const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID;
const CHANNEL = 'interview-room';
const UID = 111222;
let rtc, mic, rtm, convoAI, agentId; // the live call — kept outside React on purpose

async function post(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

export default function Home () {
  const [lines, setLines] = useState([]);
  const [started, setStarted] = useState(false);
  const [ready, setReady] = useState(false);
  const [score, setScore] = useState(null);

  async function start () {
    setStarted(true);

    // 0. Load the Agora SDKs — browser only
    const { default: AgoraRTC } = await import('agora-rtc-sdk-ng');
    const { default: AgoraRTM } = await import('agora-rtm-sdk');
    const { ConversationalAIAPI, EConversationalAIAPIEvents, ETranscriptHelperMode, EMessageType } =
      await import('agora-agent-client-toolkit');

    // 1. Ask our own server for tokens
    const res = await fetch('/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: CHANNEL, uid: UID }),
    });
    const { rtcToken, rtmToken } = await res.json();

    // 2. Join the call and turn the microphone on
    rtc = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    await rtc.join(APP_ID, CHANNEL, rtcToken, UID);
    mic = await AgoraRTC.createMicrophoneAudioTrack({
      AEC: true, // echo cancellation — stops it hearing itself
      ANS: true, // noise suppression — kills the café
      AGC: true, // auto gain — evens out how loud you are
    });
    await rtc.publish(mic);

    // 3. Play the agent's voice whenever it speaks
    rtc.on('user-published', async (user, type) => {
      if (type === 'audio') {
        await rtc.subscribe(user, type);
        user.audioTrack.play();
      }
    });

    // 4. Listen for live transcripts
    rtm = new AgoraRTM.RTM(APP_ID, String(UID));
    await rtm.login({ token: rtmToken });
    await rtm.subscribe(CHANNEL);

    convoAI = await ConversationalAIAPI.init({
      rtcEngine: rtc,
      rtmEngine: rtm,
      renderMode: ETranscriptHelperMode.TEXT,
    });

    convoAI.on(EConversationalAIAPIEvents.TRANSCRIPT_UPDATED, (items) => {
      setLines(
        items.map((item) => ({
          role: item.metadata?.object === EMessageType.USER_TRANSCRIPTION ? 'user' : 'agent',
          text: item.text,
          final: item.status !== 0, // 0 = still updating (IN_PROGRESS)
        }))
      );
    });
    convoAI.subscribeMessage(CHANNEL);


    // 5. Invite the interviewer into the call
    const invite = await fetch('/api/invite-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: CHANNEL }),
    });
    agentId = (await invite.json()).agentId;
    setReady(true)
  }

  async function finish() {
    if (agentId) await post('/api/stop-agent', { agentId });
    convoAI?.unsubscribe();
    convoAI?.destroy();
    mic?.close();
    await rtc?.leave();
    await rtm?.logout();
    setScore(await post('/api/score', { transcript: lines }));
  }


  return (
    <main className="wrap">
      <h1>AI Interviewer</h1>

      {!started && <button onClick={start}>Start interview</button>}
      {started && !ready && !score && <p>Connecting…</p>}
      {ready && !score && <button onClick={finish}>Finish &amp; get my score</button>}

      {score && (
        <div className="score">
          <h2>{score.score} / 100</h2>
          <p>{score.feedback}</p>
        </div>
      )}

      <ol className="transcript">
        {lines.map((line, i) => (
          <li key={i} className={line.final ? 'final' : 'partial'}>
            <b>{line.role === 'agent' ? 'Interviewer' : 'You'}:</b> {line.text}
          </li>
        ))}
      </ol>
    </main>
  );

}



