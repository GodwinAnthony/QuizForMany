import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
} from 'chart.js';

import { CHART_ANIMATION_MS } from '../../config/animation.js';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

const COLORS = [
  'rgba(139, 92, 246, 0.85)',
  'rgba(59, 130, 246, 0.85)',
  'rgba(236, 72, 153, 0.85)',
  'rgba(16, 185, 129, 0.85)',
];

/**
 * Live answer distribution — animated horizontal bar chart.
 * Highlights the correct option in green during reveal.
 * Animation duration is centralised in config/animation.js so the
 * chart stays in step with the rest of the pacing tweaks.
 */
export default function AnswerChart({ options = [], counts = [], correctIndex = null }) {
  const data = useMemo(() => {
    const labels = options.map((_, i) => String.fromCharCode(65 + i));
    return {
      labels,
      datasets: [
        {
          label: 'Answers',
          data: options.map((_, i) => counts[i] || 0),
          backgroundColor: options.map((_, i) =>
            correctIndex != null
              ? i === correctIndex
                ? 'rgba(16,185,129,0.9)'
                : 'rgba(255,255,255,0.15)'
              : COLORS[i % COLORS.length],
          ),
          borderRadius: 12,
          borderSkipped: false,
          barThickness: 28,
        },
      ],
    };
  }, [options, counts, correctIndex]);

  const total = counts.reduce((s, c) => s + (c || 0), 0);
  const maxScale = Math.max(4, total);

  const chartOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: CHART_ANIMATION_MS, easing: 'easeOutCubic' },
    scales: {
      x: {
        beginAtZero: true,
        max: maxScale,
        ticks: { color: 'rgba(255,255,255,0.5)', stepSize: 1, precision: 0 },
        grid: { color: 'rgba(255,255,255,0.06)' },
      },
      y: {
        ticks: { color: 'rgba(255,255,255,0.85)', font: { weight: '600', size: 14 } },
        grid: { display: false },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15,15,30,0.9)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        callbacks: {
          title: (items) => `Option ${items[0].label}`,
          label: (item) => ` ${item.formattedValue} responses`,
        },
      },
    },
  };

  return (
    <div className="space-y-3">
      <div className="h-[220px] md:h-[280px]">
        <Bar data={data} options={chartOptions} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {options.map((opt, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl border ${
              correctIndex === i
                ? 'bg-emerald-500/15 border-emerald-400/40'
                : 'bg-white/[0.04] border-white/10'
            }`}
          >
            <div
              className="w-7 h-7 rounded-lg font-semibold flex items-center justify-center text-sm"
              style={{
                background:
                  correctIndex === i
                    ? 'rgba(16,185,129,0.35)'
                    : COLORS[i % COLORS.length],
              }}
            >
              {String.fromCharCode(65 + i)}
            </div>
            <div className="flex-1 text-sm">{opt}</div>
            <div className="text-sm text-white/70 tabular-nums">{counts[i] || 0}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
