
import { useEffect, useState } from "react";

type Message = {
  event?: {
    event_id: string;
    minute: number;
    second: number;
    team: string;
    player: string;
    event_type: string;
  };
  metrics?: {
    pass_accuracy: number;
  };
  insights?: {
    type: string;
    headline: string;
    explanation: string;
  }[];
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    const source = new EventSource(
      "http://localhost:4000/api/match/stream"
    );

    source.onmessage = (message) => {
      const data = JSON.parse(message.data);

      if (!data.event) return;

      setMessages((previous) => [data, ...previous].slice(0, 30));
    };

    source.onerror = () => {
      console.error("Match stream disconnected");
    };

    return () => source.close();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <h1 className="text-3xl font-bold">MatchMind AI</h1>
      <p className="mt-2 text-slate-400">
        Live synthetic match intelligence
      </p>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-slate-900 p-5">
          <p className="text-slate-400">Pass accuracy</p>
          <p className="mt-2 text-3xl font-bold">
            {messages[0]?.metrics?.pass_accuracy ?? 0}%
          </p>
        </div>

        <div className="rounded-xl bg-slate-900 p-5">
          <p className="text-slate-400">Events received</p>
          <p className="mt-2 text-3xl font-bold">
            {messages.length}
          </p>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Live event feed</h2>

        <div className="mt-3 space-y-3">
          {messages.map((message) => (
            <article
              key={message.event?.event_id}
              className="rounded-lg border border-slate-800 p-4"
            >
              <p className="font-medium">
                {message.event?.team} — {message.event?.event_type}
              </p>

              <p className="text-sm text-slate-400">
                {message.event?.player} ·{" "}
                {message.event?.minute}:{String(
                  message.event?.second
                ).padStart(2, "0")}
              </p>

              {message.insights?.map((insight) => (
                <div key={insight.type} className="mt-3 rounded-lg bg-emerald-950 p-3">
                  <p className="font-semibold">{insight.headline}</p>
                  <p className="mt-1 text-sm">{insight.explanation}</p>
                </div>
              ))}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
