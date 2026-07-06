'use client'

import { useState } from 'react'

interface PriceInputProps {
  value: number
  onChange: (value: number) => void
  className?: string
  placeholder?: string
}

export function PriceInput({ value, onChange, className, placeholder = '0' }: PriceInputProps) {
  const [focused, setFocused] = useState(false)
  const [raw, setRaw] = useState('')

  const displayValue = focused
    ? raw
    : (value === 0 ? '' : value.toLocaleString('ko-KR'))

  function handleFocus() {
    setRaw(value === 0 ? '' : String(value))
    setFocused(true)
  }

  function handleBlur() {
    setFocused(false)
    const num = parseInt(raw.replace(/[^0-9]/g, ''), 10)
    onChange(isNaN(num) ? 0 : num)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/[^0-9]/g, '')
    setRaw(digits)
    onChange(digits === '' ? 0 : parseInt(digits, 10))
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={displayValue}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
    />
  )
}
