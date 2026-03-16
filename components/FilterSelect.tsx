"use client"

interface FilterSelectProps {
  name: string
  value?: string
  label: string
  options: { value: string; label: string }[]
  hiddenParams: Record<string, string>
  showDefault?: boolean
}

export default function FilterSelect({
  name,
  value,
  label,
  options,
  hiddenParams,
  showDefault = true,
}: FilterSelectProps) {
  return (
    <form method="GET" action="/alumni">
      {Object.entries(hiddenParams).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <select
        name={name}
        defaultValue={value ?? ""}
        onChange={(e) =>
          (e.target.closest("form") as HTMLFormElement)?.submit()
        }
        className={`input-field text-sm w-full ${value ? "border-blue-300 bg-blue-50 text-blue-700" : ""}`}
      >
        {showDefault && <option value="">{label}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </form>
  )
}
