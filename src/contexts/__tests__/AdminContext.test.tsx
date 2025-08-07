import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'
import { AdminProvider, useAdmin } from '../AdminContext'
import { createMockSupabaseClient } from '../../test/mocks/supabase'

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: createMockSupabaseClient()
}))

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AdminProvider>{children}</AdminProvider>
)

describe('AdminContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useAdmin(), { wrapper })

    expect(result.current.loading).toBe(true)
    expect(result.current.isAdmin).toBe(false)
    expect(result.current.userRoles).toEqual([])
  })

  it('should check admin status on mount', async () => {
    const { result } = renderHook(() => useAdmin(), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // The mock will return that the user is not an admin by default
    expect(result.current.isAdmin).toBe(false)
  })

  it('should handle admin status check errors gracefully', async () => {
    // Create a new mock client for this test
    const mockSupabase = createMockSupabaseClient()
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Auth error')
    })
    
    // Mock the module for this test
    vi.doMock('@/integrations/supabase/client', () => ({
      supabase: mockSupabase
    }))

    const { result } = renderHook(() => useAdmin(), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.isAdmin).toBe(false)
    expect(result.current.userRoles).toEqual([])
  })

  it('should refresh roles when called', async () => {
    const { result } = renderHook(() => useAdmin(), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    act(() => {
      result.current.refreshRoles()
    })

    expect(result.current.checkingRole).toBe(true)

    await waitFor(() => {
      expect(result.current.checkingRole).toBe(false)
    })
  })

  it('should throw error when used outside provider', () => {
    expect(() => {
      renderHook(() => useAdmin())
    }).toThrow('useAdmin must be used within an AdminProvider')
  })
})