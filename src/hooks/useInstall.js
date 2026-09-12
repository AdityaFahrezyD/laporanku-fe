import { createContext, useContext } from 'react'

export const InstallContext = createContext(null)

export default function useInstall() {
  return useContext(InstallContext)
}
