"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts"

// ============ Custom Tooltips ============
const BarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-100 shadow-lg rounded-xl px-3 py-2 text-sm">
      <p className="font-semibold text-slate-700">{label}</p>
      <p className="text-blue-600">{payload[0].value} alumni</p>
    </div>
  )
}

const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-100 shadow-lg rounded-xl px-3 py-2 text-sm">
      <p className="font-semibold text-slate-700">{payload[0].name}</p>
      <p style={{ color: payload[0].payload.color }}>
        {payload[0].value} alumni ({payload[0].payload.pct}%)
      </p>
    </div>
  )
}

function Empty() {
  return (
    <div className="flex flex-col items-center justify-center h-36 text-slate-300">
      <span className="text-3xl mb-2">📊</span>
      <p className="text-sm">Belum ada data</p>
    </div>
  )
}

// ============ Chart Components ============

export function StatusPieChart({
  data,
}: {
  data: { name: string; value: number; color: string; pct: number }[]
}) {
  const hasData = data.some((d) => d.value > 0)
  return hasData ? (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width="50%" height={200}>
        <PieChart>
          <Pie
            data={data.filter((d) => d.value > 0)}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={85}
            paddingAngle={3}
            dataKey="value"
          >
            {data
              .filter((d) => d.value > 0)
              .map((e, i) => (
                <Cell key={i} fill={e.color} />
              ))}
          </Pie>
          <Tooltip content={<PieTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex-1 space-y-2.5">
        {data
          .filter((d) => d.value > 0)
          .map((d, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: d.color }}
                />
                <span className="text-slate-600">{d.name}</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-slate-700">{d.value}</span>
                <span className="text-slate-400 text-xs ml-1">({d.pct}%)</span>
              </div>
            </div>
          ))}
      </div>
    </div>
  ) : (
    <Empty />
  )
}

export function YearBarChart({
  data,
}: {
  data: { year: string; jumlah: number }[]
}) {
  return data.length > 0 ? (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
        <XAxis
          dataKey="year"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip content={<BarTooltip />} cursor={{ fill: "#f1f5f9" }} />
        <Bar
          dataKey="jumlah"
          fill="#3b82f6"
          radius={[6, 6, 0, 0]}
          maxBarSize={44}
        />
      </BarChart>
    </ResponsiveContainer>
  ) : (
    <Empty />
  )
}

export function TrendLineChart({
  data,
}: {
  data: { year: string; jumlah: number }[]
}) {
  return data.length > 1 ? (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart
        data={data}
        margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="year"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip content={<BarTooltip />} />
        <Line
          type="monotone"
          dataKey="jumlah"
          stroke="#6366f1"
          strokeWidth={2.5}
          dot={{ fill: "#6366f1", r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  ) : (
    <Empty />
  )
}

export function HBarChart({
  data,
  color = "bg-blue-500",
}: {
  data: { name: string; jumlah: number }[]
  color?: string
}) {
  if (data.length === 0) return <Empty />
  const max = data[0].jumlah
  const colors = [
    "bg-blue-500",
    "bg-indigo-500",
    "bg-violet-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-emerald-500",
    "bg-teal-500",
    "bg-cyan-500",
    "bg-amber-500",
    "bg-orange-500",
  ]
  return (
    <div className="space-y-3">
      {data.map((d, i) => (
        <div key={i}>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="text-slate-600 truncate mr-2">{d.name}</span>
            <span className="font-semibold text-slate-700 flex-shrink-0">
              {d.jumlah}
            </span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-700 ${colors[i % colors.length]}`}
              style={{ width: `${Math.round((d.jumlah / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export function CompletenessGroupChart({
  data,
}: {
  data: { range: string; jumlah: number; color: string; pct: number }[]
}) {
  const total = data.reduce((s, d) => s + d.jumlah, 0)
  if (total === 0) return <Empty />
  return (
    <div className="space-y-4">
      {/* Progress visual */}
      <div className="h-4 rounded-full overflow-hidden flex gap-0.5">
        {data
          .filter((d) => d.jumlah > 0)
          .map((d, i) => (
            <div
              key={i}
              className="h-full rounded-sm transition-all duration-700"
              style={{ width: `${d.pct}%`, backgroundColor: d.color }}
              title={`${d.range}: ${d.jumlah} alumni (${d.pct}%)`}
            />
          ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {data.map((d, i) => (
          <div
            key={i}
            className="rounded-xl p-3 text-center border"
            style={{
              borderColor: d.color + "40",
              backgroundColor: d.color + "12",
            }}
          >
            <p className="text-2xl font-bold" style={{ color: d.color }}>
              {d.jumlah}
            </p>
            <p
              className="text-xs font-semibold mt-0.5"
              style={{ color: d.color }}
            >
              {d.range}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{d.pct}% dari total</p>
          </div>
        ))}
      </div>
    </div>
  )
}
