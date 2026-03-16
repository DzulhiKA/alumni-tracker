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
  Legend,
} from "recharts"

interface ChartData {
  statusData: { name: string; value: number; color: string }[]
  yearData: { year: string; jumlah: number }[]
  facultyData: { name: string; jumlah: number }[]
  workFieldData: { name: string; jumlah: number }[]
  completenessData: { range: string; jumlah: number; color: string }[]
}

export default function DashboardCharts({
  statusData,
  yearData,
  facultyData,
  workFieldData,
  completenessData,
}: ChartData) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-slate-100 shadow-lg rounded-xl px-3 py-2 text-sm">
          <p className="font-semibold text-slate-700">{label}</p>
          <p className="text-blue-600">{payload[0].value} alumni</p>
        </div>
      )
    }
    return null
  }

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-slate-100 shadow-lg rounded-xl px-3 py-2 text-sm">
          <p className="font-semibold text-slate-700">{payload[0].name}</p>
          <p style={{ color: payload[0].payload.color }}>
            {payload[0].value} alumni
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Baris 1: Donut status + Bar angkatan */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Donut: Status Alumni */}
        <div className="card p-6">
          <h2 className="font-bold text-slate-800 mb-1">Status Alumni</h2>
          <p className="text-xs text-slate-400 mb-4">
            Distribusi status pekerjaan saat ini
          </p>
          {statusData.every((d) => d.value === 0) ? (
            <EmptyState />
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="55%" height={180}>
                <PieChart>
                  <Pie
                    data={statusData.filter((d) => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusData
                      .filter((d) => d.value > 0)
                      .map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {statusData
                  .filter((d) => d.value > 0)
                  .map((d, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: d.color }}
                        />
                        <span className="text-slate-600 truncate">
                          {d.name}
                        </span>
                      </div>
                      <span className="font-semibold text-slate-700 ml-2">
                        {d.value}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Bar: Per Angkatan */}
        <div className="card p-6">
          <h2 className="font-bold text-slate-800 mb-1">Alumni per Angkatan</h2>
          <p className="text-xs text-slate-400 mb-4">
            Jumlah alumni berdasarkan tahun lulus
          </p>
          {yearData.length === 0 ? (
            <EmptyState />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={yearData}
                margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
              >
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
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: "#f1f5f9" }}
                />
                <Bar
                  dataKey="jumlah"
                  fill="#3b82f6"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Baris 2: Bar fakultas + Bar bidang kerja */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Bar Horizontal: Per Fakultas */}
        <div className="card p-6">
          <h2 className="font-bold text-slate-800 mb-1">Alumni per Fakultas</h2>
          <p className="text-xs text-slate-400 mb-4">
            Top fakultas berdasarkan jumlah alumni
          </p>
          {facultyData.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-3">
              {facultyData.map((d, i) => {
                const max = facultyData[0].jumlah
                const pct = Math.round((d.jumlah / max) * 100)
                const colors = [
                  "bg-blue-500",
                  "bg-indigo-500",
                  "bg-violet-500",
                  "bg-purple-500",
                  "bg-pink-500",
                ]
                return (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-slate-600 truncate mr-2">
                        {d.name}
                      </span>
                      <span className="font-semibold text-slate-700 flex-shrink-0">
                        {d.jumlah}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-700 ${colors[i % colors.length]}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Bar Horizontal: Bidang Pekerjaan */}
        <div className="card p-6">
          <h2 className="font-bold text-slate-800 mb-1">Bidang Pekerjaan</h2>
          <p className="text-xs text-slate-400 mb-4">
            Top bidang pekerjaan alumni
          </p>
          {workFieldData.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-3">
              {workFieldData.map((d, i) => {
                const max = workFieldData[0].jumlah
                const pct = Math.round((d.jumlah / max) * 100)
                const colors = [
                  "bg-emerald-500",
                  "bg-teal-500",
                  "bg-cyan-500",
                  "bg-sky-500",
                  "bg-blue-400",
                ]
                return (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-slate-600 truncate mr-2">
                        {d.name}
                      </span>
                      <span className="font-semibold text-slate-700 flex-shrink-0">
                        {d.jumlah}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-700 ${colors[i % colors.length]}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Baris 3: Kelengkapan Profil */}
      <div className="card p-6">
        <h2 className="font-bold text-slate-800 mb-1">
          Kelengkapan Profil Alumni
        </h2>
        <p className="text-xs text-slate-400 mb-5">
          Distribusi persentase kelengkapan profil
        </p>
        {completenessData.every((d) => d.jumlah === 0) ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {completenessData.map((d, i) => (
              <div
                key={i}
                className={`rounded-2xl p-4 text-center border`}
                style={{
                  borderColor: d.color + "40",
                  backgroundColor: d.color + "10",
                }}
              >
                <p className="text-2xl font-bold" style={{ color: d.color }}>
                  {d.jumlah}
                </p>
                <p
                  className="text-xs font-semibold mt-1"
                  style={{ color: d.color }}
                >
                  {d.range}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">alumni</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-32 text-slate-300">
      <span className="text-3xl mb-2">📊</span>
      <p className="text-sm">Belum ada data</p>
    </div>
  )
}
