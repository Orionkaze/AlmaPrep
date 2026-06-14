"use client"

import { useEffect } from "react"

export default function RevealOnScroll() {
  useEffect(() => {
    const reveals = document.querySelectorAll(".reveal")
    if (!("IntersectionObserver" in window) || !reveals.length) {
      reveals.forEach(el => el.classList.add("is-visible"))
      return
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible")
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" })

    reveals.forEach(el => observer.observe(el))

    return () => {
      observer.disconnect()
    }
  }, [])

  return null
}
