import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Available { id: string; activity_name: string; icon: string }
interface Req { activity_id: string; church_id: string; church_name: string; governorate: string }

const HIGH_DEMAND = 20;

const AdminActivityRequests = () => {
  const { toast } = useToast();
  const [available, setAvailable] = useState<Available[]>([]);
  const [requests, setRequests] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🙏");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: acts }, { data: reqs }] = await Promise.all([
      supabase.from("available_activities").select("id, activity_name, icon").order("created_at"),
      supabase.from("activity_requests").select("activity_id, church_id, church_name, governorate"),
    ]);
    setAvailable(acts || []);
    setRequests(reqs || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    const n = name.trim();
    if (!n) return;
    setSaving(true);
    const { error } = await supabase.from("available_activities").insert({ activity_name: n, icon: icon.trim() || "🙏" });
    setSaving(false);
    if (error) { toast({ title: "لم تتم الإضافة", description: error.message, variant: "destructive" }); return; }
    setName("");
    toast({ title: "تمت إضافة النشاط" });
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("available_activities").delete().eq("id", id);
    if (error) { toast({ title: "تعذر الحذف", variant: "destructive" }); return; }
    load();
  };

  const groups = new Map<string, { church: string; gov: string; activity: string; count: number }>();
  for (const r of requests) {
    const act = available.find((a) => a.id === r.activity_id);
    const key = `${r.church_id}|${r.activity_id}`;
    const cur = groups.get(key);
    if (cur) cur.count += 1;
    else groups.set(key, { church: r.church_name, gov: r.governorate, activity: act?.activity_name || "نشاط", count: 1 });
  }
  const stats = Array.from(groups.values()).sort((a, b) => b.count - a.count);
  const hot = stats.filter((s) => s.count >= HIGH_DEMAND);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-accent" /></div>;

  return (
    <div className="space-y-5">
      {hot.map((h, i) => (
        <div key={i} className="rounded-xl border border-amber-300 bg-amber-50 p-3 flex items-start gap-2">
          <TrendingUp className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-900 leading-relaxed">
            في إقبال شديد على {h.activity} في {h.church} - {h.gov}. عدد الطلبات: {h.count}
            <span className="block text-[10px] mt-1 opacity-80">من فضلك وصّل الطلب لقدس أبونا.</span>
          </p>
        </div>
      ))}

      <div className="space-y-2">
        <h3 className="text-sm font-bold">الأنشطة المتاحة للطلب</h3>
        <div className="flex gap-2">
          <Input value={icon} onChange={(e) => setIcon(e.target.value)} className="w-14 h-10 text-center rounded-xl" />
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم النشاط" className="flex-1 h-10 rounded-xl text-sm" />
          <Button onClick={add} disabled={saving} size="icon" className="h-10 w-10 rounded-xl">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </Button>
        </div>
        {available.map((a) => (
          <div key={a.id} className="flex items-center justify-between bg-card border border-border/60 rounded-xl px-3 py-2">
            <Button variant="ghost" size="icon" onClick={() => remove(a.id)}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
            <span className="text-sm font-medium">{a.activity_name} {a.icon}</span>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-bold">إحصائيات الطلبات</h3>
        {stats.length === 0 && <p className="text-xs text-muted-foreground">لا توجد طلبات بعد</p>}
        {stats.map((s, i) => (
          <div key={i} className="flex items-center justify-between bg-card border border-border/60 rounded-xl px-3 py-2">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="w-3.5 h-3.5" /> {s.count}
            </span>
            <div className="text-right">
              <p className="text-sm font-medium">{s.activity}</p>
              <p className="text-[10px] text-muted-foreground">{s.church} - {s.gov}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminActivityRequests;
