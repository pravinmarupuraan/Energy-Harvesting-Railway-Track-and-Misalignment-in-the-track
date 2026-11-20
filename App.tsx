import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  Activity,
  ArrowDown,
  ArrowUpRight,
  AudioLines,
  Bot,
  ChevronDown,
  CircleHelp,
  Gauge,
  Menu,
  Plus,
  Radio,
  Send,
  ShieldCheck,
  Sparkles,
  TrainFront,
  Waves,
  Zap,
} from "lucide-react";

type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
  time: string;
};

type ChatResponse = {
  reply?: string;
  response?: string;
  error?: string;
};

type ServiceStatus = "checking" | "connected" | "offline";

type SensorReading = {
  track_gauge_mm?: number;
  vertical_deflection_mm?: number;
  vibration_g?: number;
  harvested_voltage_v?: number;
  power_w?: number;
  timestamp?: string;
  received_at: string;
};

type TelemetryResponse = {
  connected: boolean;
  reading: SensorReading | null;
};

type DemoCheck = {
  label: string;
  detail: string;
  status: "normal" | "alert" | "unavailable" | "measured";
};

const demoTrackData = {
  gaugeMm: 1435,
  nominalGaugeMm: 1435,
  vibrationG: 0.18,
  vibrationAlertG: 0.45,
  verticalDeflectionMm: null as number | null,
};

function checkDemoTrackData(): DemoCheck[] {
  return [
    {
      label: "Track gauge",
      detail: `${demoTrackData.gaugeMm.toLocaleString()} mm · nominal ${demoTrackData.nominalGaugeMm.toLocaleString()} mm`,
      status: demoTrackData.gaugeMm === demoTrackData.nominalGaugeMm ? "normal" : "alert",
    },
    {
      label: "Vibration",
      detail: `${demoTrackData.vibrationG.toFixed(2)} g · demo alert at ${demoTrackData.vibrationAlertG.toFixed(2)} g`,
      status: demoTrackData.vibrationG >= demoTrackData.vibrationAlertG ? "alert" : "normal",
    },
    {
      label: "Vertical deflection",
      detail:
        demoTrackData.verticalDeflectionMm === null
          ? "No demo reading available"
          : `${demoTrackData.verticalDeflectionMm.toFixed(1)} mm`,
      status: demoTrackData.verticalDeflectionMm === null ? "unavailable" : "normal",
    },
  ];
}

const suggestions = [
  "Check the latest track alignment",
  "Explain a gauge widening alert",
  "How much energy was harvested today?",
];

const initialMessages: Message[] = [
  {
    id: 1,
    role: "assistant",
    content:
      "Good morning. I’m RailGuard, your railway monitoring copilot. I can help interpret track sensor alerts, review energy-harvesting readings, and suggest maintenance follow-ups. What would you like to check?",
    time: "09:41",
  },
];

const chatApiUrl =
  import.meta.env.VITE_CHAT_API_URL || "http://127.0.0.1:5000/api/chat";
const chatHealthUrl = chatApiUrl.replace(/\/chat\/?$/, "/health");
const telemetryUrl = new URL("/api/telemetry", chatApiUrl).toString();

function currentTime() {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

function App() {
  const demoChecks = checkDemoTrackData();
  const hasDemoAlert = demoChecks.some((check) => check.status === "alert");
  const demoChecksComplete = demoChecks.every(
    (check) => check.status !== "unavailable",
  );
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>("checking");
  const [telemetry, setTelemetry] = useState<TelemetryResponse | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const conversationRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sensorReading = telemetry?.reading ?? null;
  const sensorConnected = telemetry?.connected ?? false;
  const liveChecks: DemoCheck[] = sensorReading
    ? [
        {
          label: "Track gauge",
          detail:
            sensorReading.track_gauge_mm === undefined
              ? "No reading received"
              : `${sensorReading.track_gauge_mm.toFixed(1)} mm`,
          status:
            sensorReading.track_gauge_mm === undefined
              ? "unavailable"
              : "measured",
        },
        {
          label: "Vibration",
          detail:
            sensorReading.vibration_g === undefined
              ? "No reading received"
              : `${sensorReading.vibration_g.toFixed(2)} g`,
          status:
            sensorReading.vibration_g === undefined
              ? "unavailable"
              : "measured",
        },
        {
          label: "Vertical deflection",
          detail:
            sensorReading.vertical_deflection_mm === undefined
              ? "No reading received"
              : `${sensorReading.vertical_deflection_mm.toFixed(1)} mm`,
          status:
            sensorReading.vertical_deflection_mm === undefined
              ? "unavailable"
              : "measured",
        },
      ]
    : demoChecks;
  const gaugeValue = sensorReading?.track_gauge_mm;
  const vibrationValue = sensorReading?.vibration_g;
  const deflectionValue = sensorReading?.vertical_deflection_mm;

  useEffect(() => {
    conversationRef.current?.scrollTo({
      top: conversationRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isSending]);

  useEffect(() => {
    let active = true;

    async function checkChatService() {
      try {
        const response = await fetch(chatHealthUrl);
        if (!response.ok) throw new Error("Chat service health check failed");
        if (active) setServiceStatus("connected");
      } catch {
        if (active) setServiceStatus("offline");
      }
    }

    void checkChatService();
    const intervalId = window.setInterval(() => {
      void checkChatService();
    }, 5000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function readTelemetry() {
      try {
        const response = await fetch(telemetryUrl);
        if (!response.ok) throw new Error("Telemetry request failed");
        const data = (await response.json()) as TelemetryResponse;
        if (active) setTelemetry(data);
      } catch {
        if (active) setTelemetry(null);
      }
    }

    void readTelemetry();
    const intervalId = window.setInterval(() => {
      void readTelemetry();
    }, 2000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  async function sendMessage(text: string, retrying = false) {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    const lastMessage = messages[messages.length - 1];
    const baseMessages =
      retrying && lastMessage?.role === "user"
        ? messages.slice(0, -1)
        : messages;
    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      content: trimmed,
      time: currentTime(),
    };
    const conversation = [...baseMessages, userMessage];
    setMessages(conversation);
    setInput("");
    setError("");
    setIsSending(true);

    try {
      const response = await fetch(chatApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          history: conversation.map(({ role, content }) => ({ role, content })),
        }),
      });

      let data: ChatResponse;
      try {
        data = (await response.json()) as ChatResponse;
      } catch {
        throw new Error("Chat service returned an invalid response.");
      }
      if (!response.ok) {
        throw new Error(
          data.error || `Chat service returned HTTP ${response.status}`,
        );
      }

      const reply = data.reply ?? data.response;
      if (typeof reply !== "string" || !reply.trim()) {
        throw new Error("Chat service returned an empty or invalid reply");
      }

      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: reply.trim(),
          time: currentTime(),
        },
      ]);
    } catch (requestError) {
      console.error("RailGuard chat request failed:", requestError);
      setError(
        requestError instanceof TypeError
          ? "Could not reach the Flask service. Start it with `python app.py` and check that the browser is using the correct chat API URL."
          : requestError instanceof Error
            ? requestError.message
            : "RailGuard AI request failed. Check the Flask terminal for details.",
      );
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(input);
    }
  }

  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileMenuOpen ? "sidebar-open" : ""}`}>
        <a className="brand" href="#" aria-label="RailGuard home">
          <span className="brand-mark">
            <TrainFront size={21} strokeWidth={2.2} />
          </span>
          <span className="brand-name">
            <strong>RAILGUARD</strong>
            <span>INTELLIGENCE SYSTEMS</span>
          </span>
        </a>

        <button className="new-chat" onClick={() => setMessages(initialMessages)}>
          <Plus size={17} />
          <span>New conversation</span>
          <span className="shortcut">⌘ K</span>
        </button>

        <div className="sidebar-label">WORKSPACE</div>
        <button className="workspace-select">
          <span className="workspace-icon"><Activity size={15} /></span>
          <span className="workspace-copy">
            <strong>Network operations</strong>
            <small>North corridor</small>
          </span>
          <ChevronDown size={15} />
        </button>

        <div className="sidebar-label recent-label">RECENT</div>
        <button className="recent-item recent-active">
          <span className="recent-dot" />
          <span>Morning track review</span>
        </button>
        <button className="recent-item">
          <span className="recent-dot muted" />
          <span>Vibration alert · KM 42</span>
        </button>
        <button className="recent-item">
          <span className="recent-dot muted" />
          <span>Weekly energy summary</span>
        </button>

        <div className="sidebar-bottom">
          <div className="local-card">
            <span className="local-icon"><ShieldCheck size={16} /></span>
            <div>
              <strong>Private by design</strong>
              <p>AI runs on your local network</p>
            </div>
            <span className="local-status" />
          </div>
          <button className="help-link"><CircleHelp size={16} /> Help & documentation</button>
          <div className="user-profile">
            <div className="user-avatar">OP</div>
            <div className="user-copy"><strong>Operations team</strong><span>Control center</span></div>
            <button className="icon-button profile-menu" aria-label="Profile menu"><Menu size={17} /></button>
          </div>
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <button
            className="icon-button mobile-menu-button"
            aria-label="Open navigation"
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            <Menu size={20} />
          </button>
          <div className="breadcrumb"><span>Copilot</span><span className="crumb-slash">/</span><strong>Morning track review</strong></div>
          <div className="topbar-right">
            <span className="service-indicator">
              <span className={`status-dot status-${serviceStatus}`} />
              {serviceStatus === "connected"
                ? "CHAT SERVICE CONNECTED"
                : serviceStatus === "checking"
                  ? "CHECKING CHAT SERVICE"
                  : "CHAT SERVICE OFFLINE"}
            </span>
            <button className="icon-button help-button" aria-label="Help"><CircleHelp size={18} /></button>
          </div>
        </header>

        <div className="content-layout">
          <section className="chat-column" aria-label="RailGuard chat">
            <div className="conversation" ref={conversationRef}>
              <div className="day-divider"><span /> TODAY, 16 NOV <span /></div>

              <div className="welcome-heading">
                <div className="assistant-avatar"><Bot size={21} /></div>
                <div>
                  <h1>Good morning, operator<span>.</span></h1>
                  <p>Your network is being monitored. How can I help?</p>
                </div>
              </div>

              <div className="messages">
                {messages.map((message) => (
                  <article className={`message message-${message.role}`} key={message.id}>
                    {message.role === "assistant" ? (
                      <div className="message-avatar"><Bot size={16} /></div>
                    ) : (
                      <div className="message-avatar user-message-avatar">OP</div>
                    )}
                    <div className="message-body">
                      <div className="message-meta">
                        <strong>{message.role === "assistant" ? "RailGuard" : "You"}</strong>
                        <time>{message.time}</time>
                        {message.role === "assistant" && <span className="ai-tag"><Sparkles size={10} /> AI COPILOT</span>}
                      </div>
                      <p>{message.content}</p>
                    </div>
                  </article>
                ))}
                {isSending && (
                  <article className="message message-assistant">
                    <div className="message-avatar"><Bot size={16} /></div>
                    <div className="message-body">
                      <div className="message-meta"><strong>RailGuard</strong><span className="thinking-label">ANALYZING</span></div>
                      <div className="typing-indicator" aria-label="RailGuard is responding"><i /><i /><i /></div>
                    </div>
                  </article>
                )}
              </div>
            </div>

            {messages.length <= 1 && (
              <div className="suggestions">
                <span className="suggestion-label">SUGGESTED</span>
                <div className="suggestion-list">
                  {suggestions.map((suggestion, index) => (
                    <button className="suggestion" key={suggestion} onClick={() => void sendMessage(suggestion)}>
                      {index === 0 ? <Gauge size={15} /> : index === 1 ? <Waves size={15} /> : <Zap size={15} />}
                      <span>{suggestion}</span>
                      <ArrowUpRight size={14} className="suggestion-arrow" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="composer-wrap">
              {error && (
                <div className="error-banner" role="alert">
                  <span>{error}</span>
                  <button onClick={() => void sendMessage(messages[messages.length - 1]?.content ?? "", true)}>Retry</button>
                </div>
              )}
              <form className="composer" onSubmit={handleSubmit}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleInputKeyDown}
                  placeholder="Ask about track conditions, alerts, or energy generation..."
                  rows={1}
                  aria-label="Message RailGuard"
                  disabled={isSending}
                />
                <div className="composer-footer">
                  <div className="composer-hints">
                    <span className="model-badge"><span /> LLAMA 3.2</span>
                    <span className="hint-divider" />
                    <span>Local inference</span>
                  </div>
                  <div className="composer-actions">
                    <span className="enter-hint">↵ to send</span>
                    <button className="send-button" type="submit" disabled={!input.trim() || isSending} aria-label="Send message">
                      <Send size={15} />
                    </button>
                  </div>
                </div>
              </form>
              <p className="disclaimer"><ShieldCheck size={12} /> AI responses are advisory. Verify critical safety decisions with approved procedures.</p>
            </div>
          </section>

          <aside className="insights-panel">
            <div className="insights-heading"><div><span className="eyebrow">SAMPLE OVERVIEW</span><h2>Network pulse</h2></div><button className="icon-button" aria-label="Sample telemetry preview"><AudioLines size={17} /></button></div>
            <div className="corridor-card">
              <div className="corridor-title"><span className="corridor-icon"><Radio size={15} /></span><span><strong>North corridor</strong><small>Section 04 · KM 38—56</small></span><span className={`live-tag ${sensorReading ? "" : "demo-tag"}`}>{sensorReading ? sensorConnected ? "ESP32 LIVE" : "STALE" : "DEMO"}</span></div>
              <div className="track-diagram"><span className="track-line" /><span className="track-node node-one" /><span className="track-node node-two" /><span className="track-node node-three" /><span className="track-train"><TrainFront size={16} /></span></div>
              <div className="track-legend"><span>KM 38</span><span>12 sensors active</span><span>KM 56</span></div>
            </div>

            <div className={`detection-card ${hasDemoAlert && !sensorReading ? "detection-card-alert" : ""}`}>
              <div className="detection-heading">
                <span className="detection-icon"><ShieldCheck size={15} /></span>
                <span className="detection-title">
                  <strong>Automatic track check</strong>
                  <small>{sensorReading ? "Live readings · limits not configured" : "Evaluated from demo values"}</small>
                </span>
                <span className={`detection-badge ${hasDemoAlert && !sensorReading ? "detection-badge-alert" : ""}`}>
                  {sensorReading ? sensorConnected ? "LIMITS OFF" : "STALE" : hasDemoAlert ? "ALERT" : demoChecksComplete ? "NORMAL" : "PARTIAL"}
                </span>
              </div>
              <div className="detection-checks">
                {liveChecks.map((check) => (
                  <div className="detection-check" key={check.label}>
                    <span className={`detection-indicator detection-indicator-${check.status}`} />
                    <span className="detection-check-copy">
                      <strong>{check.label}</strong>
                      <small>{check.detail}</small>
                    </span>
                    <span className={`detection-result detection-result-${check.status}`}>
                      {check.status === "unavailable"
                        ? "NO DATA"
                        : check.status === "measured"
                          ? "MEASURED"
                          : check.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
              <p className="detection-note">
                {sensorReading
                  ? "Readings only—safety alerts stay off until approved limits are configured."
                  : "Demo only—not live monitoring or approved railway safety limits."}
              </p>
            </div>

            <div className="section-heading"><span className="eyebrow">{sensorReading ? "ESP32 TRACK DATA" : "SAMPLE SENSOR DATA"}</span><span className={`updated-label ${sensorReading ? "" : "mock-label"}`}>{sensorReading ? sensorConnected ? "LIVE" : "STALE" : "MOCK VALUES"}</span></div>
            <div className="metric-card">
              <div className="metric-top"><span className="metric-icon gauge-icon"><Gauge size={16} /></span><span className="metric-name">Track gauge</span><span className={`metric-state ${sensorReading ? gaugeValue === undefined ? "state-neutral" : "state-info" : demoChecks[0].status === "alert" ? "state-alert" : "state-good"}`}>{sensorReading ? gaugeValue === undefined ? "NO DATA" : sensorConnected ? "LIVE" : "STALE" : demoChecks[0].status === "alert" ? "CHECK" : "NORMAL"}</span></div>
              <div className="metric-value">{sensorReading ? gaugeValue === undefined ? "—" : gaugeValue.toFixed(1) : demoTrackData.gaugeMm.toLocaleString()} <span>mm</span></div>
              <div className="metric-foot"><span>{sensorReading ? gaugeValue === undefined ? "No ESP32 reading received" : "Live reading · limits not set" : "Nominal 1,435 mm"}</span>{!sensorReading && <span className="metric-trend"><ArrowDown size={12} /> 0.2 mm</span>}</div>
              {!sensorReading && <div className="range-track"><span className="range-fill gauge-fill" /></div>}
            </div>
            <div className="metric-card">
              <div className="metric-top"><span className="metric-icon vibration-icon"><Waves size={16} /></span><span className="metric-name">Vibration index</span><span className={`metric-state ${sensorReading ? vibrationValue === undefined ? "state-neutral" : "state-info" : demoChecks[1].status === "alert" ? "state-alert" : "state-good"}`}>{sensorReading ? vibrationValue === undefined ? "NO DATA" : sensorConnected ? "LIVE" : "STALE" : demoChecks[1].status === "alert" ? "CHECK" : "NORMAL"}</span></div>
              <div className="metric-value">{sensorReading ? vibrationValue === undefined ? "—" : vibrationValue.toFixed(2) : demoTrackData.vibrationG.toFixed(2)} <span>g</span></div>
              <div className="metric-foot"><span>{sensorReading ? vibrationValue === undefined ? "No ESP32 reading received" : "Live reading · limit not set" : `Demo alert threshold ${demoTrackData.vibrationAlertG.toFixed(2)} g`}</span>{!sensorReading && <span className="metric-trend">Stable</span>}</div>
              {!sensorReading && <div className="range-track"><span className="range-fill vibration-fill" /></div>}
            </div>
            <div className="metric-card">
              <div className="metric-top"><span className="metric-icon vibration-icon"><Activity size={16} /></span><span className="metric-name">Vertical deflection</span><span className={`metric-state ${deflectionValue !== undefined ? "state-info" : "state-neutral"}`}>{deflectionValue === undefined ? "NO DATA" : sensorConnected ? "LIVE" : "STALE"}</span></div>
              <div className="metric-value">{deflectionValue === undefined ? "—" : deflectionValue.toFixed(1)} <span>mm</span></div>
              <div className="metric-foot"><span>{deflectionValue === undefined ? "Waiting for ESP32 reading" : "Live reading · limit not set"}</span></div>
            </div>
            {sensorReading && (sensorReading.harvested_voltage_v !== undefined || sensorReading.power_w !== undefined) && (
              <div className="metric-card">
                <div className="metric-top"><span className="metric-icon energy-icon"><Zap size={16} /></span><span className="metric-name">Harvested output</span><span className={`metric-state state-info`}>{sensorConnected ? "LIVE" : "STALE"}</span></div>
                <div className="telemetry-energy-values">
                  <span>{sensorReading.harvested_voltage_v?.toFixed(2) ?? "—"} <small>V</small></span>
                  <span>{sensorReading.power_w?.toFixed(2) ?? "—"} <small>W</small></span>
                </div>
                <div className="metric-foot"><span>Voltage · power</span></div>
              </div>
            )}
            <div className="section-heading"><span className="eyebrow">SAMPLE ENERGY DATA</span><span className="updated-label mock-label">MOCK VALUES</span></div>
            <div className="metric-card energy-card">
              <div className="metric-top"><span className="metric-icon energy-icon"><Zap size={16} /></span><span className="metric-name">Harvested today</span><span className="energy-change">+12.4%</span></div>
              <div className="metric-value">2.84 <span>kWh</span></div>
              <div className="energy-chart" aria-label="Energy harvested over the last 24 hours">
                {[28, 38, 31, 51, 45, 37, 58, 47, 42, 69, 53, 62, 49, 76, 57, 68, 82, 62, 71, 57, 88, 72, 94, 78].map((height, index) => (
                  <i key={index} style={{ height: `${height}%` }} />
                ))}
              </div>
              <div className="chart-labels"><span>00:00</span><span>12:00</span><span>NOW</span></div>
            </div>

            <button className="dashboard-link">
              <span className="dashboard-link-icon"><Activity size={15} /></span>
              <span><strong>Open full dashboard</strong><small>Explore all sensor data</small></span>
              <ArrowUpRight size={16} />
            </button>

            <div className="insights-footer"><span><span className={`footer-dot ${sensorReading ? "" : "demo-footer-dot"}`} /> {sensorReading ? sensorConnected ? "ESP32 TELEMETRY · LIVE" : "ESP32 DATA · STALE" : "DEMO DATA · NOT LIVE"}</span><span>ESP32 · MPU6050</span></div>
          </aside>
        </div>
      </section>
    </main>
  );
}

export default App;
