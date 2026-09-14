document.documentElement.classList.add('js');

// Always open the homepage at the top instead of restoring an old scroll position.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.addEventListener('load', () => {
  if (!location.hash) window.scrollTo(0, 0);
}, { once: true });

const menuBtn = document.querySelector('.menu-btn');
const nav = document.querySelector('.nav');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const setMenuOpen = open => {
  if (!menuBtn || !nav) return;
  nav.classList.toggle('open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
};

menuBtn?.addEventListener('click', () => setMenuOpen(!nav?.classList.contains('open')));
document.querySelectorAll('.nav a').forEach(a => a.addEventListener('click', () => setMenuOpen(false)));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && nav?.classList.contains('open')) {
    setMenuOpen(false);
    menuBtn?.focus();
  }
});
document.addEventListener('click', event => {
  if (!nav?.contains(event.target) && !menuBtn?.contains(event.target)) setMenuOpen(false);
});
document.addEventListener('focusin', event => {
  if (!nav?.contains(event.target) && !menuBtn?.contains(event.target)) setMenuOpen(false);
});
window.addEventListener('resize', () => {
  if (window.innerWidth > 820) setMenuOpen(false);
});


// Page-load animation trigger.
requestAnimationFrame(() => document.body.classList.add('page-loaded'));

// Expand the floating navigation smoothly over the first part of the scroll.
const header = document.querySelector('.site-header');
const headerScrollRange = 160;
let headerFrame;

const setHeaderState = () => {
  if (!header) return;
  const progress = Math.min(Math.max(window.scrollY / headerScrollRange, 0), 1);
  header.style.setProperty('--header-progress', progress.toFixed(4));
  header.classList.toggle('scrolled', progress > 0);
  updateActiveNavigation();
  headerFrame = undefined;
};

const requestHeaderState = () => {
  if (headerFrame === undefined) headerFrame = requestAnimationFrame(setHeaderState);
};

window.addEventListener('scroll', requestHeaderState, { passive: true });

// Scroll-reveal animation. Classes are added in JS so the HTML remains clean/editable.
const revealGroups = [
  '.section-heading',
  '.service-card',
  '.process-grid article',
  '.ship-item',
  '.ship-center',
  '.why-text',
  '.why-visual',
  '.testimonial',
  '.stats-card',
  '.global-map',
  '.country-bar',
  '.quote-copy',
  '.quote-photo',
  '.quote-form',
  '.mini-process',
  '.location-card',
  '.route'
];

const revealEls = [...document.querySelectorAll(revealGroups.join(','))];
revealEls.forEach(el => {
  el.classList.add('reveal-on-scroll');
  // Small stagger inside repeating grids, capped so later sections do not wait too long.
  const siblingIndex = [...(el.parentElement?.children || [])].indexOf(el);
  el.style.setProperty('--reveal-delay', `${Math.min(Math.max(siblingIndex, 0) * 55, 260)}ms`);
});

if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  revealEls.forEach(el => revealObserver.observe(el));
} else {
  revealEls.forEach(el => el.classList.add('revealed'));
}

// Active navigation item follows the current section.
const navLinks = [...document.querySelectorAll('.nav a[href^="#"]')];
const sectionMap = navLinks
  .map(link => ({ link, section: document.querySelector(link.getAttribute('href')) }))
  .filter(item => item.section);

const updateActiveNavigation = () => {
  let current = sectionMap[0];
  for (const item of sectionMap) {
    if (item.section.getBoundingClientRect().top <= 110) current = item;
  }
  navLinks.forEach(link => {
    const active = link === current?.link;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
};
setHeaderState();
window.addEventListener('resize', requestHeaderState);
window.addEventListener('load', requestHeaderState, { once: true });

// Pointer-following glass reflection. Runs only on devices with a fine pointer.
const glassTargets = document.querySelectorAll(
  '.service-card,.process-grid article,.ship-item,.testimonial,.stats-card,.quote-form,.location-card'
);
if (window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
  glassTargets.forEach(card => {
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });
}

// Lightweight button ripple.
document.querySelectorAll('.btn,.round-link,.slider-arrow,.back-top').forEach(el => {
  el.addEventListener('pointerdown', e => {
    const r = el.getBoundingClientRect();
    const dot = document.createElement('span');
    dot.className = 'ripple-dot';
    const size = Math.max(r.width, r.height) * .55;
    dot.style.width = dot.style.height = `${size}px`;
    dot.style.left = `${e.clientX - r.left}px`;
    dot.style.top = `${e.clientY - r.top}px`;
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    if (getComputedStyle(el).overflow === 'visible') el.style.overflow = 'hidden';
    el.appendChild(dot);
    dot.addEventListener('animationend', () => dot.remove(), { once: true });
  });
});

// Testimonial carousel controls and mobile swipe/dot state.
const testimonialGrid = document.querySelector('.testimonial-grid');
const testimonialCards = testimonialGrid ? [...testimonialGrid.querySelectorAll('.testimonial')] : [];
const testimonialDotGroup = document.querySelector('.testimonials-section .dots');
const testimonialPrev = document.querySelector('.testimonial-wrap .prev');
const testimonialNext = document.querySelector('.testimonial-wrap .next');
let testimonialDots = [];
let testimonialStops = [0];
let testimonialIndex = 0;

const updateTestimonialControls = () => {
  testimonialDots.forEach((dot, i) => {
    dot.classList.toggle('on', i === testimonialIndex);
    dot.setAttribute('aria-pressed', String(i === testimonialIndex));
  });
  if (testimonialPrev) testimonialPrev.disabled = testimonialIndex === 0;
  if (testimonialNext) testimonialNext.disabled = testimonialIndex === testimonialStops.length - 1;
};

const setTestimonial = (index, smooth = true) => {
  if (!testimonialGrid || !testimonialCards.length) return;
  testimonialIndex = Math.max(0, Math.min(index, testimonialStops.length - 1));
  testimonialGrid.scrollTo({
    left: testimonialStops[testimonialIndex],
    behavior: smooth && !reducedMotion.matches ? 'smooth' : 'instant'
  });
  updateTestimonialControls();
};

// Use the actual scroll range so every dot works at every viewport size.
const layoutTestimonials = () => {
  if (!testimonialGrid || !testimonialCards.length) return;
  const maxScroll = Math.max(0, testimonialGrid.scrollWidth - testimonialGrid.clientWidth);
  const firstOffset = testimonialCards[0].offsetLeft;
  testimonialStops = [0];
  testimonialCards.forEach(card => {
    const left = Math.min(maxScroll, card.offsetLeft - firstOffset);
    if (left > testimonialStops.at(-1) + 1) testimonialStops.push(left);
  });
  if (testimonialDotGroup && testimonialDots.length !== testimonialStops.length) {
    testimonialDots = testimonialStops.map((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('aria-label', `Show testimonial group ${i + 1}`);
      dot.setAttribute('aria-controls', 'testimonial-cards');
      dot.addEventListener('click', () => setTestimonial(i));
      return dot;
    });
    testimonialDotGroup.replaceChildren(...testimonialDots);
  }
  setTestimonial(testimonialIndex, false);
};

testimonialPrev?.addEventListener('click', () => setTestimonial(testimonialIndex - 1));
testimonialNext?.addEventListener('click', () => setTestimonial(testimonialIndex + 1));
testimonialGrid?.addEventListener('keydown', event => {
  const actions = { ArrowLeft: testimonialIndex - 1, ArrowRight: testimonialIndex + 1, Home: 0, End: testimonialStops.length - 1 };
  if (!(event.key in actions)) return;
  event.preventDefault();
  setTestimonial(actions[event.key]);
});

let testimonialScrollTimer;
testimonialGrid?.addEventListener('scroll', () => {
  clearTimeout(testimonialScrollTimer);
  testimonialScrollTimer = setTimeout(() => {
    const left = testimonialGrid.scrollLeft;
    let nearest = 0;
    let distance = Infinity;
    testimonialStops.forEach((stop, i) => {
      const d = Math.abs(stop - left);
      if (d < distance) { distance = d; nearest = i; }
    });
    testimonialIndex = nearest;
    updateTestimonialControls();
  }, 120);
}, { passive: true });

window.addEventListener('resize', layoutTestimonials);
window.addEventListener('load', layoutTestimonials, { once: true });
layoutTestimonials();

// Prepare the enquiry in WhatsApp; the customer sends it there.
const enquiryForm = document.querySelector('#whatsappEnquiryForm');
if (enquiryForm) {
  const fields = enquiryForm.elements;
  const status = document.querySelector('#enquiry-status');
  const whatsappLink = document.querySelector('#enquiry-whatsapp-link');
  const validateField = field => {
    field.setCustomValidity('');
    const value = field.value.trim();
    if (field.required && !value) field.setCustomValidity('Please complete this field.');
    else if (field.name === 'phone') {
      const digits = value.replace(/\D/g, '');
      if (!/^\+?[\d\s().-]+$/.test(value) || digits.length < 7 || digits.length > 15) {
        field.setCustomValidity('Enter a valid phone number with 7 to 15 digits, including the country code.');
      }
    }
  };
  enquiryForm.querySelectorAll('input').forEach(field => {
    field.addEventListener('input', () => {
      validateField(field);
      status.hidden = true;
      whatsappLink.removeAttribute('href');
    });
  });
  enquiryForm.addEventListener('submit', event => {
    event.preventDefault();
    enquiryForm.querySelectorAll('input').forEach(validateField);
    if (!enquiryForm.reportValidity()) return;
    const lines = [
      '3A Logistics - New Enquiry', '',
      `Name: ${fields.namedItem('name').value.trim()}`,
      `Phone: ${fields.namedItem('phone').value.trim()}`,
      `City: ${fields.namedItem('city').value.trim()}`
    ];
    const message = fields.namedItem('message').value.trim();
    if (message) lines.push(`Message: ${message}`);
    const whatsappURL = `https://wa.me/918652631182?text=${encodeURIComponent(lines.join('\n'))}`;
    whatsappLink.href = whatsappURL;
    status.hidden = false;
    window.open(whatsappURL, '_blank', 'noopener,noreferrer');
  });
  enquiryForm.querySelector('[type="submit"]').disabled = false;
}

// Keep the footer copyright year current.
const yearEl = document.querySelector('#current-year');
if (yearEl) yearEl.textContent = new Date().getFullYear();
