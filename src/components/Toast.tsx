import { useEffect, useState } from 'react'

export const Toast = ({ msg }: { msg: string }) => {
  const [show, setShow] = useState(true)
  useEffect(() => { 
    const t = setTimeout(() => setShow(false), 2500)
    return () => clearTimeout(t) 
  }, [])
  if (!show) return null
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-black text-white text-sm px-4 py-2 rounded-xl shadow z-50">
      {msg}
    </div>
  )
}
