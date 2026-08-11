import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Loader2, X, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useChurchStore } from "@/hooks/useChurchStore";
import { useToast } from "@/hooks/use-toast";

type Phase = "idle" | "listening" | "thinking" | "speaking";

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: Array<Array<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

const VoiceAssistant = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { churches } = useChurchStore();
  const [phase, setPhase] = useState<Phase>("idle");
  const [heard, setHeard] = useState("");
  const [answer, setAnswer] = useState("");
  const [text, setText] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const speak = useCallback((value: string) => {
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(value);
      u.lang = "ar-EG";
      u.rate = 0.9;
      u.onend = () => setPhase("idle");
      setPhase("speaking");
      window.speechSynthesis.speak(u);
    } catch {
      setPhase("idle");
    }
  }, []);

  const ask = useCallback(
    async (question: string) => {
      setPhase("thinking");
      try {
        const payload = churches.map((c) => ({
          id: c.id,
          church_name: c.name,
          governorate: c.governorate,
          city: c.city,
          subRegion: c.subRegion,
          address: c.address,
          activities: c.activities.map((a) => ({
            activity_type: a.type,
            day: a.day,
            time: a.time,
            end_time: a.endTime,
            location: a.location,
          })),
        }));
        const nowDate = new Date();
        const { data, error } = await supabase.functions.invoke("voice-chat", {
          body: {
            question,
            churches: payload,
            currentDate: nowDate.toLocaleDateString("ar-EG", {
              weekday: "long", year: "numeric", month: "long", day: "numeric",
            }),
            currentTime: nowDate.toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" }),
          },
        });
        if (error) throw error;
        const reply: string = data?.answer || "مش عندي المعلومة دي حاليا بس اقدر اتأكدلك";
        setAnswer(reply);
        speak(reply);
        if (data?.churchId) {
          setTimeout(() => navigate(`/church/${data.churchId}`), 2500);
        }
      } catch {
        const reply = "معلش، حصلت مشكلة. جرب تاني.";
        setAnswer(reply);
        speak(reply);
      }
    },
    [churches, navigate, speak]
  );

  const startListening = useCallback(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      toast({ title: "المتصفح لا يدعم التعرف على الصوت", variant: "destructive" });
      return;
    }
    const rec = new SR();
    recognitionRef.current = rec;
    rec.lang = "ar-EG";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const said = e.results[0][0].transcript;
      setHeard(said);
      ask(said);
    };
    rec.onerror = () => {
      setPhase("idle");
      toast({ title: "لم أسمع بوضوح، حاول تاني", variant: "destructive" });
    };
    rec.onend = () => setPhase((p) => (p === "listening" ? "idle" : p));
    setHeard("");
    setAnswer("");
    setPhase("listening");
    rec.start();
  }, [ask, toast]);

  const stopAll = () => {
    try { recognitionRef.current?.stop(); } catch { /* noop */ }
    window.speechSynthesis.cancel();
    setPhase("idle");
  };

  const submitText = () => {
    const q = text.trim();
    if (!q) return;
    setHeard(q);
    setAnswer("");
    setText("");
    ask(q);
  };

  const busy = phase !== "idle";

  return (
    <>
      <AnimatePresence>
        {(heard || answer) && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            dir="rtl"
            className="fixed bottom-24 left-3 right-3 z-40 mx-auto max-w-md rounded-2xl bg-card border border-accent/40 shadow-card-hover p-4 space-y-2"
          >
            <button
              onClick={() => { setHeard(""); setAnswer(""); stopAll(); }}
              aria-label="إغلاق"
              className="absolute top-2 left-2 p-1 rounded-full text-muted-foreground hover:bg-muted"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            {heard && <p className="text-xs text-muted-foreground">أنت: {heard}</p>}
            {answer && <p className="text-base font-semibold text-foreground leading-relaxed">{answer}</p>}
            {phase === "thinking" && (
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> بفكر...
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* شريط الشات: زر الميك على اليمين جنب خانة الكتابة */}
      <div
        dir="rtl"
        className="fixed bottom-4 left-3 right-3 z-50 mx-auto max-w-md flex items-center gap-2 rounded-full bg-card border border-border shadow-xl px-2 py-2"
      >
        <button
          onClick={busy ? stopAll : startListening}
          aria-label="اسألني"
          className="relative flex items-center gap-1.5 rounded-full bg-amber-600 px-3.5 py-2.5 text-primary-foreground active:scale-95 transition-transform shrink-0"
        >
          {phase === "thinking" ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : busy ? (
            <X className="w-5 h-5" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
          <span className="text-sm font-bold">
            {phase === "listening" ? "بسمعك..." : phase === "speaking" ? "بتكلم..." : "اسألني"}
          </span>
          {phase === "listening" && (
            <span className="absolute inset-0 rounded-full bg-amber-500/40 animate-ping -z-10" />
          )}
        </button>

        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submitText(); }}
          placeholder="اكتب سؤالك..."
          className="flex-1 min-w-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground px-2 focus:outline-none"
        />

        <button
          onClick={submitText}
          aria-label="إرسال"
          disabled={!text.trim()}
          className="p-2 rounded-full text-muted-foreground hover:bg-muted disabled:opacity-40 shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </>
  );
};

export default VoiceAssistant;
