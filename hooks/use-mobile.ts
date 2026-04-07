import * as React from "react"

const MOBILE_QUERY = "(max-width: 767px)"

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY)

    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches)
    }

    // Set initial value
    setIsMobile(mql.matches)

    // Listen for changes
    mql.addEventListener("change", handleChange)

    return () => {
      mql.removeEventListener("change", handleChange)
    }
  }, [])

  return isMobile
}