import { motion } from "framer-motion";
import type { DayName } from "@/types/church";
import { DAYS } from "@/types/church";

interface DayWheelProps {
  selectedDay: DayName;
  onSelectDay: (day: DayName) => void;
}

const DAY_ICONS = ["☀️", "✝️", "🌙", "⭐", "📖", "🕊️", "🙏"];

const DayWheel = ({ selectedDay, onSelectDay }: DayWheelProps) => {
  const cx = 170;
  const cy = 170;
  const outerR = 155;
  const innerR = 55;
  const segmentCount = 7;
  const gapAngle = 3;
  const segmentAngle = 360 / segmentCount;

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const getSegmentPath = (index: number) => {
    const startAngle = index * segmentAngle - 90 + gapAngle / 2;
    const endAngle = (index + 1) * segmentAngle - 90 - gapAngle / 2;
    const os = { x: cx + outerR * Math.cos(toRad(startAngle)), y: cy + outerR * Math.sin(toRad(startAngle)) };
    const oe = { x: cx + outerR * Math.cos(toRad(endAngle)), y: cy + outerR * Math.sin(toRad(endAngle)) };
    const is_ = { x: cx + innerR * Math.cos(toRad(endAngle)), y: cy + innerR * Math.sin(toRad(endAngle)) };
    const ie = { x: cx + innerR * Math.cos(toRad(startAngle)), y: cy + innerR * Math.sin(toRad(startAngle)) };
    return `M ${os.x} ${os.y} A ${outerR} ${outerR} 0 0 1 ${oe.x} ${oe.y} L ${is_.x} ${is_.y} A ${innerR} ${innerR} 0 0 0 ${ie.x} ${ie.y} Z`;
  };

  const getLabelPos = (index: number, radiusOffset = 0) => {
    const midAngle = index * segmentAngle - 90 + segmentAngle / 2;
    const r = (outerR + innerR) / 2 + radiusOffset;
    return { x: cx + r * Math.cos(toRad(midAngle)), y: cy + r * Math.sin(toRad(midAngle)) };
  };

  return (
    <div className="flex justify-center">
      <div className="relative">
        <svg viewBox="0 0 340 340" className="w-[280px] h-[280px] sm:w-[320px] sm:h-[320px]" style={{ filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.08))" }}>
          <defs>
            <linearGradient id="goldRing" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(42, 85%, 56%)" />
              <stop offset="50%" stopColor="hsl(42, 85%, 70%)" />
              <stop offset="100%" stopColor="hsl(38, 70%, 38%)" />
            </linearGradient>
            <linearGradient id="selectedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(218, 58%, 42%)" />
              <stop offset="100%" stopColor="hsl(218, 58%, 55%)" />
            </linearGradient>
            <filter id="selectedGlow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Outer gold ring */}
          <circle cx={cx} cy={cy} r={outerR + 6} fill="none" stroke="url(#goldRing)" strokeWidth="3" opacity="0.6" />

          {/* Segments */}
          {DAYS.map((day, i) => {
            const isSelected = day === selectedDay;
            const textPos = getLabelPos(i, -8);
            const iconPos = getLabelPos(i, 16);
            return (
              <g key={day} className="cursor-pointer" onClick={() => onSelectDay(day)}>
                <motion.path
                  d={getSegmentPath(i)}
                  initial={false}
                  animate={{ scale: isSelected ? 1.05 : 1 }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  style={{ transformOrigin: `${cx}px ${cy}px` }}
                  fill={isSelected ? "url(#selectedGrad)" : "hsl(40, 25%, 99%)"}
                  stroke={isSelected ? "hsl(218, 58%, 42%)" : "hsl(38, 20%, 85%)"}
                  strokeWidth={isSelected ? 2 : 1}
                  filter={isSelected ? "url(#selectedGlow)" : undefined}
                />
                <text
                  x={textPos.x}
                  y={textPos.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className={`pointer-events-none text-[11px] sm:text-[12px] font-bold ${isSelected ? "fill-primary-foreground" : "fill-foreground"}`}
                  style={{ fontFamily: "IBM Plex Sans Arabic" }}
                >
                  {day}
                </text>
                <text
                  x={iconPos.x}
                  y={iconPos.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="pointer-events-none text-[14px]"
                >
                  {DAY_ICONS[i]}
                </text>
              </g>
            );
          })}

          {/* Center circle */}
          <circle cx={cx} cy={cy} r={innerR - 3} fill="hsl(40, 25%, 99%)" stroke="url(#goldRing)" strokeWidth="2" />
          <text x={cx} y={cy - 8} textAnchor="middle" className="fill-primary text-[12px] font-bold" style={{ fontFamily: "IBM Plex Sans Arabic" }}>
            ✝
          </text>
          <text x={cx} y={cy + 10} textAnchor="middle" className="fill-muted-foreground text-[9px] font-medium" style={{ fontFamily: "IBM Plex Sans Arabic" }}>
            اختر يوم
          </text>
        </svg>
      </div>
    </div>
  );
};

export default DayWheel;
