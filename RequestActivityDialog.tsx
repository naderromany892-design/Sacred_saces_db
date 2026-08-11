import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HandHeart, ChevronRight, Loader2, Users, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useChurchStore } from "@/hooks/useChurchStore";

export interface AvailableActivity {
  id: string;
  activity_name: string;
  icon: string;
}

const DEVICE_KEY = "request_device_id_v1";

export const getDeviceId = () => {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const RequestActivityDialog = ({ open, onOpenChange }: Props) => {
  const { toast } = useToast();
  const { churches } = useChurchStore();
  const [step, setStep] = useState(0);
  const [gov, setGov] = useState("");
  const [churchId, setChurchId] = useState("");
  const [search, setSearch] = useState("");
  const [activities, setActivities] = useState<AvailableActivity[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [doneMsg, setDoneMsg] = useState("");

  const church = churches.find((c) => c.id === churchId);
  const govs = useMemo(
    () => Array.from(new Set(churches.map((c) => c.governorate))).sort(),
    [churches]
  );
  const govChurches = useMemo(
    () => churches.filter((c) => c.governorate === gov && c.name.includes(search.trim())),
    [churches, gov, search]
  );

  useEffect(() => {
    if (!open) {
      setStep(0);
      setGov("");
      setChurchId("");
      setSearch("");
      setDoneMsg("");
    }
  }, [open]);

  useEffect(() => {
    if (step !== 3 || !churchId) return;
    setLoading(true);
    (async () => {
      const [{ data: acts }, { data: reqs }] = await Promise.all([
        supabase.from("available_activities").select("id, activity_name, icon").order("created_at"),
        supabase.from("activity_requests").select("activity_id").eq("church_id", churchId),
      ]);
      setActivities(acts || []);
      const map: Record<string, number> = {};
      (reqs || []).forEach((r) => {
        map[r.activity_id] = (map[r.activity_id] || 0) + 1;
      });
      setCounts(map);
      setLoading(false);
    })();
  }, [step, churchId]);

  const submit = async (act: AvailableActivity) => {
    if (!church) return;
    setSubmitting(act.id);
    const { error } = await supabase.from("activity_requests").insert({
      church_id: church.id,
      church_name: church.name,
      governorate: church.governorate,
      activity_id: act.id,
      device_id: getDeviceId(),
    });
    setSubmitting(null);
    if (error) {
      if (error.code === "23505") {
        toast({ title: "أنت طلبت النشاط ده قبل كده 🙏" });
        return;
      }
      toast({ title: "حصل خطأ، حاول تاني", variant: "destructive" });
      return;
    }
    const next = (counts[act.id] || 0) + 1;
    setCounts({ ...counts, [act.id]: next });
    setDoneMsg(`تم! انت رقم ${next} اللي طلب ${act.activity_name} في ${church.name}`);
    setStep(4);
  };

  const titles = ["طلب نشاط", "اختر المحافظة", "اختر الكنيسة", "اختر النشاط", "تم الطلب"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-right text-base">{titles[step]}</DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.18 }}
            className="space-y-3 max-h-[60vh] overflow-y-auto"
          >
            {step === 0 && (
              <div className="space-y-4 text-center py-2">
                <div className="w-14 h-14 rounded-full bg-accent/15 mx-auto flex items-center justify-center">
                  <HandHeart className="w-7 h-7 text-accent" />
                </div>
                <p className="text-sm leading-relaxed text-foreground">
                  من هنا تقدر تطلب من كنيستك أي نشاط نفسك فيه.
                  <br />
                  كل ما زاد عدد الطلبات على نشاط معين، بنوصّل للآباء الكهنة عشان يتعمل.
                </p>
                <Button className="w-full rounded-xl" onClick={() => setStep(1)}>
                  ابدأ
                </Button>
              </div>
            )}

            {step === 1 &&
              govs.map((g) => (
                <button
                  key={g}
                  onClick={() => {
                    setGov(g);
                    setStep(2);
                  }}
                  className="w-full flex items-center justify-between bg-card border border-border/60 rounded-xl px-3 py-2.5 text-sm hover:border-accent transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-muted-foreground rotate-180" />
                  <span className="font-medium">{g}</span>
                </button>
              ))}

            {step === 2 && (
              <>
                <Input
                  placeholder="ابحث عن كنيسة..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="rounded-xl h-10 text-sm"
                />
                {govChurches.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setChurchId(c.id);
                      setStep(3);
                    }}
                    className="w-full flex items-center justify-between bg-card border border-border/60 rounded-xl px-3 py-2.5 text-sm hover:border-accent transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-muted-foreground rotate-180" />
                    <span className="font-medium text-right">{c.name}</span>
                  </button>
                ))}
                {govChurches.length === 0 && (
                  <p className="text-center text-xs text-muted-foreground py-4">لا توجد كنائس</p>
                )}
              </>
            )}

            {step === 3 &&
              (loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-accent" />
                </div>
              ) : (
                activities.map((a) => (
                  <button
                    key={a.id}
                    disabled={submitting !== null}
                    onClick={() => submit(a)}
                    className="w-full flex items-center justify-between bg-card border border-border/60 rounded-xl px-3 py-2.5 hover:border-accent transition-colors disabled:opacity-60"
                  >
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Users className="w-3.5 h-3.5" />
                      عدد الطلبات: {counts[a.id] || 0}
                    </span>
                    <span className="text-sm font-medium flex items-center gap-2">
                      {submitting === a.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {a.activity_name} <span>{a.icon}</span>
                    </span>
                  </button>
                ))
              ))}

            {step === 4 && (
              <div className="text-center space-y-4 py-4">
                <div className="w-14 h-14 rounded-full bg-emerald-500/15 mx-auto flex items-center justify-center">
                  <Check className="w-7 h-7 text-emerald-600" />
                </div>
                <p className="text-sm font-medium leading-relaxed">{doneMsg}</p>
                <Button variant="outline" className="w-full rounded-xl" onClick={() => onOpenChange(false)}>
                  تمام
                </Button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default RequestActivityDialog;
