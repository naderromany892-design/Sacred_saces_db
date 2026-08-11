import { motion } from "framer-motion";
import { Clock, MapPin, Church as ChurchIcon } from "lucide-react";
import type { Church, ChurchActivity, ActivityType } from "@/types/church";

interface ActivityCardProps {
  church: Church;
  activity: ChurchActivity;
  index: number;
}

const TYPE_STYLES: Record<ActivityType, { bg: string; text: string; icon: string }> = {
  "قداس": { bg: "bg-primary/10", text: "text-primary", icon: "✝️" },
  "اجتماع": { bg: "bg-accent/15", text: "text-accent-foreground", icon: "👥" },
  "تسبحة": { bg: "bg-gold-light", text: "text-gold-dark", icon: "🎵" },
  "خدمة": { bg: "bg-secondary", text: "text-secondary-foreground", icon: "🤲" },
  "اجتماع شباب": { bg: "bg-blue-soft", text: "text-primary", icon: "⚡" },
  "مدارس الأحد": { bg: "bg-accent/10", text: "text-accent-foreground", icon: "📚" },
};

const ActivityCard = ({ church, activity, index }: ActivityCardProps) => {
  const style = TYPE_STYLES[activity.type] || TYPE_STYLES["قداس"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="bg-card rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden"
    >
      <div className="flex gap-3 p-4">
        {/* Church image or placeholder */}
        <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-secondary">
          {church.imageUrl ? (
            <img
              src={church.imageUrl}
              alt={church.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ChurchIcon className="w-6 h-6 text-muted-foreground/40" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-bold text-foreground leading-tight truncate">
              {church.name}
            </h3>
            <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${style.bg} ${style.text}`}>
              <span>{style.icon}</span>
              {activity.type}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 font-semibold text-foreground">
              <Clock className="w-3 h-3 text-accent" />
              {activity.time}
            </span>
            {activity.location && (
              <span className="inline-flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3 shrink-0" />
                {activity.location}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ActivityCard;
