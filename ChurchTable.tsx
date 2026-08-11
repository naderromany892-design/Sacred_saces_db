import { Plus, Trash2, ImagePlus } from "lucide-react";
import type { Church, DayName, ActivityType } from "@/types/church";
import { DAYS, ACTIVITY_TYPES } from "@/types/church";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
interface ChurchTableProps {
  churches: Church[];
  onChange: (churches: Church[]) => void;
}

const emptyChurch = (): Church => ({
  id: crypto.randomUUID(),
  name: "",
  governorate: "",
  city: "",
  address: "",
  fixedMasses: [],
  prayerTimes: [],
  imageUrl: "",
  activities: [],
});

const textFields: { key: "name" | "city" | "address"; label: string; placeholder: string }[] = [
  { key: "name", label: "اسم الكنيسة", placeholder: "مثال: كنيسة العذراء مريم" },
  { key: "city", label: "المدينة", placeholder: "مثال: القاهرة" },
  { key: "address", label: "العنوان", placeholder: "مثال: شارع رمسيس، وسط البلد" },
];

const ChurchTable = ({ churches, onChange }: ChurchTableProps) => {
  const updateField = (id: string, key: "name" | "city" | "address" | "imageUrl", value: string) => {
    onChange(churches.map((c) => (c.id === id ? { ...c, [key]: value } : c)));
  };

  const addActivity = (churchId: string) => {
    onChange(
      churches.map((c) =>
        c.id === churchId
          ? {
              ...c,
              activities: [
                ...c.activities,
                { id: crypto.randomUUID(), day: "الأحد" as DayName, type: "قداس" as ActivityType, time: "", sortTime: "00:00", location: "" },
              ],
            }
          : c
      )
    );
  };

  const updateActivity = (churchId: string, actId: string, field: string, value: string) => {
    onChange(
      churches.map((c) =>
        c.id === churchId
          ? {
              ...c,
              activities: c.activities.map((a) =>
                a.id === actId ? { ...a, [field]: value } : a
              ),
            }
          : c
      )
    );
  };

  const removeActivity = (churchId: string, actId: string) => {
    onChange(
      churches.map((c) =>
        c.id === churchId
          ? { ...c, activities: c.activities.filter((a) => a.id !== actId) }
          : c
      )
    );
  };

  const addRow = () => onChange([...churches, emptyChurch()]);
  const removeRow = (id: string) => onChange(churches.filter((c) => c.id !== id));

  return (
    <div className="space-y-4">
      {churches.map((church, i) => (
        <div key={church.id} className="bg-card rounded-xl shadow-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
  <span className="text-xs font-semibold text-muted">
    {church.name}
  </span>
  
  {/* زرار الجرس */}
  <button 
    onClick={() => toggleFollow(church.id, church.name)}
    className="p-1"
  >
    <Bell 
      className={followingList.includes(church.id)? "fill-green-500 text-green-500" : "text-gray-400"} 
      size={16}
    />
    {followingList.includes(church.id) && <span className="text-[10px]">✅</span>}
  </button>
</div>
            -foreground">كنيسة #{i + 1}</span>
            <button onClick={() => removeRow(church.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-lg hover:bg-destructive/10">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {textFields.map((f) => (
              <div key={f.key}>
                <label className="text-[10px] font-medium text-muted-foreground mb-1 block">{f.label}</label>
                <input
                  type="text"
                  value={church[f.key]}
                  onChange={(e) => updateField(church.id, f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full bg-background rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  dir="rtl"
                />
              </div>
            ))}
          </div>

          {/* Image URL */}
          <div>
            <label className="text-[10px] font-medium text-muted-foreground mb-1 block">صورة الكنيسة</label>
            <div className="flex items-center gap-2">
              <ImagePlus className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                type="url"
                value={church.imageUrl}
                onChange={(e) => updateField(church.id, "imageUrl", e.target.value)}
                placeholder="https://example.com/church.jpg"
                className="w-full bg-background rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                dir="ltr"
              />
            </div>
          </div>

          {/* Activities */}
          <div className="space-y-2">
            <label className="text-[10px] font-medium text-muted-foreground block">الأنشطة</label>
            {church.activities.map((act) => (
              <div key={act.id} className="bg-background rounded-lg p-3 space-y-2">
                <div className="flex gap-2">
                  <select
                    value={act.day}
                    onChange={(e) => updateActivity(church.id, act.id, "day", e.target.value)}
                    className="bg-card rounded-md px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    dir="rtl"
                  >
                    {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <select
                    value={act.type}
                    onChange={(e) => updateActivity(church.id, act.id, "type", e.target.value)}
                    className="bg-card rounded-md px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    dir="rtl"
                  >
                    {ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <button onClick={() => removeActivity(church.id, act.id)} className="text-muted-foreground hover:text-destructive p-1 mr-auto">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={act.time}
                    onChange={(e) => updateActivity(church.id, act.id, "time", e.target.value)}
                    placeholder="الوقت: ٨:٠٠ ص"
                    className="flex-1 bg-card rounded-md px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    dir="rtl"
                  />
                  <input
                    type="text"
                    value={act.location}
                    onChange={(e) => updateActivity(church.id, act.id, "location", e.target.value)}
                    placeholder="المكان: القاعة الكبرى"
                    className="flex-1 bg-card rounded-md px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    dir="rtl"
                  />
                </div>
                <input
                  type="text"
                  value={act.sortTime}
                  onChange={(e) => updateActivity(church.id, act.id, "sortTime", e.target.value)}
                  placeholder="ترتيب الوقت: 08:00"
                  className="w-24 bg-card rounded-md px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  dir="ltr"
                />
              </div>
            ))}
            <button onClick={() => addActivity(church.id)} className="text-xs text-primary hover:underline font-medium">
              + إضافة نشاط
            </button>
          </div>
        </div>
      ))}

      <button onClick={addRow} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary font-medium text-sm transition-colors">
        <Plus className="w-4 h-4" />
        إضافة كنيسة جديدة
      </button>
    </div>
  );
};
const [followingList, setFollowingList] = useState<string[]>([]);

const toggleFollow = async (church_id: string, church_name: string) => {
  const isFollowing = followingList.includes(church_id);
  if (isFollowing) {
    // الغاء المتابعة
    await supabase.from("church_followers").delete()
      .eq("church_id", church_id);
    setFollowingList(followingList.filter(id => id !== church_id));
    toast("تم الغاء المتابعة");
  } else {
    // متابعة
    await supabase.from("church_followers").insert({ 
      church_id: church_id 
    });
    setFollowingList([...followingList, church_id]);
    toast(`تم! هنج
export default ChurchTable;
