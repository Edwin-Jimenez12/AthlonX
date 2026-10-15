'use client'

import { useCallback, useEffect, useState } from 'react'
import { loadAccountMeta } from '../../lib/mi-perfil'
import type { AccountMeta } from '../../lib/mi-perfil'

const initial: AccountMeta = { email: '', createdAt: null, lastSignInAt: null, deletionScheduledAt: null }

export function useAccountMeta() {
  const [meta, setMeta] = useState<AccountMeta>(initial)
  const refresh = useCallback(() => {
    void loadAccountMeta().then(setMeta)
  }, [])
  useEffect(() => {
    refresh()
  }, [refresh])
  return meta
}
