'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

type Option = { value: string; count: number }

export default function FilterGroup({
  title,
  options,
  selectedValue,
  onChange,
  type = 'select',
  defaultOpen = true,
}: {
  title: string
  options: Option[]
  selectedValue?: string
  onChange: (value: string) => void
  type?: string
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  if (!options || options.length === 0) return null

  return (
    <div className="border border-gray-100 rounded-xl">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-3 py-2.5 flex items-center justify-between"
      >
        <span className="text-sm font-bold text-gray-800">{title}</span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-1.5">
          {options.map((option) => (
            <label key={option.value} className="flex items-center justify-between gap-2 text-sm text-gray-600">
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedValue === option.value}
                  onChange={() => onChange(selectedValue === option.value ? '' : option.value)}
                />
                {option.value}
              </span>
              <span className="text-xs text-gray-400">({option.count})</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

