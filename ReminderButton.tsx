import { useEffect, useMemo, useState } from "react";
import { Bell } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { ChurchActivity, DayName } from "@/types/church";

const DAY_TO_INDEX: Record<DayName, number> = {
  "الأحد": 0, "الاثنين": 1, "الثلاثاء": 2, "الأربعاء": 3,
  "الخميس": 4, "الجمعة": 5, "السبت": 6,
};

const AR_MONTHS = [
  "يناير","فبراير","مارس","إبريل","مايو","يونيو",
  "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر",
];
const AR_DAYS = ["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];

const QUICK: { label: string; minutes: number }[] = [
  { label: "قبل ٥د", minutes: 5 },
  { label: "قبل ٣٠د", minutes: 30 },
  { label: "قبل ساعة", minutes: 60 },
  { label: "قبل يوم", minutes: 60 * 24 },
];

const storageKey = (churchId: string, activityId: string) =>
  `reminder:${churchId}:${activityId}`;

const nextOccurrence = (activity: ChurchActivity): Date => {
  const now = new Date();
  const targetDay = DAY_TO_INDEX[activity.day];
  const [h, m] = activity.sortTime.split(":").map((x) => parseInt(x, 10));
  const d = new Date(now);
  const diff = (targetDay - now.getDay() + 7) % 7;
  d.setDate(now.getDate() + diff);
  d.setHours(h || 0, m || 0, 0, 0);
  if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 7);
  return d;
};

const toHHMM = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

const format12h = (d: Date) => {
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const period = h >= 12 ? "م" : "ص";
  const disp = h % 12 === 0 ? 12 : h % 12;
  return `${disp}:${m} ${period}`;
};

/** جرس كنيسة هادي + رسالة صوتية */
const playChurchBell = (message = "اقترب موعد القداس") => {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.9].forEach((offset) => {
      const t = ctx.currentTime + offset;
      [660, 990].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(i === 0 ? 0.18 : 0.07, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 1.7);
      });
    });
    setTimeout(() => {
      try {
        const u = new SpeechSynthesisUtterance(message);
        u.lang = "ar-EG";
        u.rate = 0.9;
        window.speechSynthesis.speak(u);
      } catch { /* noop */ }
    }, 2200);
  } catch { /* noop */ }
};


interface Props {
  churchId: string;
  activity: ChurchActivity;
  churchName: string;
}

const ReminderButton = ({ churchId, activity, churchName }: Props) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);

  const occur = useMemo(() => nextOccurrence(activity), [activity, open]);
  const defaultFire = useMemo(() => new Date(occur.getTime() - 30 * 60_000), [occur]);
  const [pickedTime, setPickedTime] = useState<string>(toHHMM(defaultFire));

  useEffect(() => {
    if (typeof window === "undefined") return;
    setEnabled(!!localStorage.getItem(storageKey(churchId, activity.id)));
  }, [churchId, activity.id]);

  useEffect(() => {
    if (open) setPickedTime(toHHMM(defaultFire));
  }, [open, defaultFire]);

  const applyQuick = (minutes: number) => {
    setPickedTime(toHHMM(new Date(occur.getTime() - minutes * 60_000)));
  };

  const buildFireDate = (): Date | null => {
    const [hh, mm] = pickedTime.split(":").map((x) => parseInt(x, 10));
    if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
    // Interpret picked time as time-of-day on the day of the occurrence.
    // If the resulting time is after the occurrence, roll back one day.
    const fire = new Date(occur);
    fire.setHours(hh, mm, 0, 0);
    if (fire.getTime() > occur.getTime()) {
      fire.setDate(fire.getDate() - 1);
    }
    return fire;
  };

  const activate = async () => {
    try {
      if ("Notification" in window && Notification.permission !== "granted") {
        const p = await Notification.requestPermission();
        if (p !== "granted") {
          toast({ title: "برجاء السماح بالإشعارات", variant: "destructive" });
          return;
        }
      }
      const fire = buildFireDate();
      if (!fire) {
        toast({ title: "وقت غير صالح", variant: "destructive" });
        return;
      }
      const delay = fire.getTime() - Date.now();
      if (delay <= 0) {
        toast({ title: "هذا الوقت مضى بالفعل", variant: "destructive" });
        return;
      }
      const safeDelay = Math.min(delay, 2_000_000_000);
      const minutesBefore = Math.max(0, Math.round((occur.getTime() - fire.getTime()) / 60_000));
      window.setTimeout(() => {
        const started = Date.now() >= occur.getTime();
        const title = started ? `${activity.type} بدأ الآن` : `تذكير: ${activity.type}`;
        const body = started
          ? `${churchName} — بدأ الآن الساعة ${format12h(occur)}`
          : `${activity.type} ${churchName} هيبدأ بعد ${minutesBefore} دقيقة - الساعة ${format12h(occur)}`;
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(title, { body, icon: "/placeholder.svg" });
        }
        playChurchBell();
      }, safeDelay);

      localStorage.setItem(
        storageKey(churchId, activity.id),
        JSON.stringify({ fireAt: fire.getTime() })
      );
      setEnabled(true);
      setOpen(false);

      const dayName = AR_DAYS[occur.getDay()];
      const dateLabel = `${occur.getDate()} ${AR_MONTHS[occur.getMonth()]}`;
      const timeLabel = format12h(occur);
      toast({
        title: "تمام! سأذكرك ✨",
        description: `${activity.type} يوم ${dayName} ${dateLabel} الساعة ${timeLabel}`,
        className:
          "bg-white border-2 border-[#D4AF37]/60 shadow-lg rounded-2xl text-[#1F2937]",
      });
    } catch {
      toast({ title: "تعذر تفعيل التذكير", variant: "destructive" });
    }
  };

  const disable = () => {
    localStorage.removeItem(storageKey(churchId, activity.id));
    setEnabled(false);
    setOpen(false);
    toast({ title: "تم إلغاء التذكير" });
  };

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className="p-1.5 rounded-full hover:bg-neutral-100 transition-colors"
        aria-label="تذكير بالموعد"
      >
        <Bell
          className="w-3.5 h-3.5 transition-colors"
          style={{ color: enabled ? "#D4AF37" : "#9CA3AF", fill: enabled ? "#D4AF37" : "transparent" }}
        />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-sm rounded-2xl p-0 overflow-hidden">
          {/* Gold top accent */}
          <div className="h-1 w-full bg-gradient-to-l from-[#FDE68A] to-[#D4AF37]" />
          <div className="p-5 space-y-4">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-base font-bold text-[#1F2937] flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#D4AF37]" />
                متى أذكرك؟
              </DialogTitle>
              <p className="text-[11px] text-neutral-500">
                {activity.type} — {activity.day} • {activity.time}
              </p>
            </DialogHeader>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-neutral-600 block">
                وقت التنبيه
              </label>
              <input
                type="time"
                value={pickedTime}
                onChange={(e) => setPickedTime(e.target.value)}
                dir="ltr"
                className="w-full text-lg font-bold text-[#1F2937] tracking-wider bg-[#FFFBEB] border border-[#FDE68A] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40"
              />
            </div>

            <div>
              <p className="text-[10px] text-neutral-500 mb-1.5">اختصارات سريعة</p>
              <div className="grid grid-cols-4 gap-1.5">
                {QUICK.map((q) => (
                  <button
                    key={q.minutes}
                    onClick={() => applyQuick(q.minutes)}
                    className="text-[11px] font-semibold py-1.5 rounded-lg bg-neutral-50 hover:bg-[#FDE68A]/40 text-neutral-700 border border-neutral-200 transition-colors"
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 pt-0 gap-2 sm:gap-2">
            {enabled && (
              <Button variant="outline" onClick={disable} className="flex-1 rounded-xl text-xs">
                إلغاء التذكير
              </Button>
            )}
            <Button
              onClick={activate}
              className="flex-1 rounded-xl text-sm font-bold border-0 shadow-md"
              style={{
                background: "linear-gradient(135deg, #FDE68A 0%, #D4AF37 100%)",
                color: "#1F2937",
              }}
            >
              تم
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ReminderButton;
