import './style.css'

// Current year in footer
const yearEl = document.getElementById('year')
if (yearEl) yearEl.textContent = new Date().getFullYear()

// Scroll-reveal: fade + rise elements as they enter the viewport
const revealEls = document.querySelectorAll('.reveal')
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in')
          io.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  )
  revealEls.forEach((el) => io.observe(el))
} else {
  // Fallback: no observer support → just show everything
  revealEls.forEach((el) => el.classList.add('is-in'))
}
