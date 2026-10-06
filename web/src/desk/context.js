import { createContext, useContext } from 'react'

// { st, ui, setUi, ops, act, toast, workspace }
export const DeskContext = createContext(null)
export const useD = () => useContext(DeskContext)
