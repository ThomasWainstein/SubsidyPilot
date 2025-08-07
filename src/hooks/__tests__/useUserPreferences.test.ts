import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUserPreferences } from '../useUserPreferences'

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  clear: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
})

describe('useUserPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with default preferences when localStorage is empty', () => {
    mockLocalStorage.getItem.mockReturnValue(null)

    const { result } = renderHook(() => useUserPreferences())

    expect(result.current.preferences.suppressPrefillPrompt).toBe(false)
    expect(result.current.isLoading).toBe(false)
  })

  it('should load preferences from localStorage', () => {
    const storedPreferences = {
      suppressPrefillPrompt: true
    }
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedPreferences))

    const { result } = renderHook(() => useUserPreferences())

    expect(result.current.preferences.suppressPrefillPrompt).toBe(true)
  })

  it('should handle invalid JSON in localStorage gracefully', () => {
    mockLocalStorage.getItem.mockReturnValue('invalid-json')
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { result } = renderHook(() => useUserPreferences())

    expect(result.current.preferences.suppressPrefillPrompt).toBe(false)
    expect(consoleSpy).toHaveBeenCalledWith('Failed to load user preferences:', expect.any(Error))
    
    consoleSpy.mockRestore()
  })

  it('should update preferences and save to localStorage', () => {
    mockLocalStorage.getItem.mockReturnValue(null)

    const { result } = renderHook(() => useUserPreferences())

    act(() => {
      result.current.setSuppressPrefillPrompt(true)
    })

    expect(result.current.preferences.suppressPrefillPrompt).toBe(true)
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'agritool_user_preferences',
      JSON.stringify({ suppressPrefillPrompt: true })
    )
  })

  it('should handle localStorage errors when saving', () => {
    mockLocalStorage.getItem.mockReturnValue(null)
    mockLocalStorage.setItem.mockImplementation(() => {
      throw new Error('localStorage error')
    })
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { result } = renderHook(() => useUserPreferences())

    act(() => {
      result.current.setSuppressPrefillPrompt(true)
    })

    expect(result.current.preferences.suppressPrefillPrompt).toBe(true)
    expect(consoleSpy).toHaveBeenCalledWith('Failed to save user preferences:', expect.any(Error))
    
    consoleSpy.mockRestore()
  })

  it('should update partial preferences', () => {
    const existingPrefs = { suppressPrefillPrompt: true }
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(existingPrefs))

    const { result } = renderHook(() => useUserPreferences())

    act(() => {
      result.current.updatePreferences({ suppressPrefillPrompt: false })
    })

    expect(result.current.preferences.suppressPrefillPrompt).toBe(false)
  })
})