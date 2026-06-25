import './style.css'

// ?pdfpreview → render the A4 brochure layout on screen (for visual review)
if (location.search.includes('pdfpreview')) document.body.classList.add('pdfpreview')

// "Download Brochure" → opens the print dialog, which renders the dedicated
// A4 brochure layout (see @media print in style.css). Users pick "Save as PDF".
const downloadBtn = document.getElementById('downloadBtn')
if (downloadBtn) downloadBtn.addEventListener('click', () => window.print())

// Scroll-reveal for landing sections
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
  revealEls.forEach((el) => el.classList.add('is-in'))
}
