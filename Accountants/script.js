const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------- Mobile navigation ----------

const header = document.querySelector('.site-header');
const navToggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('#site-nav');

function setNavOpen(open) {
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('nav-open', open);
}

navToggle.addEventListener('click', () => {
    setNavOpen(navToggle.getAttribute('aria-expanded') !== 'true');
});

nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setNavOpen(false));
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav.classList.contains('is-open')) {
        setNavOpen(false);
        navToggle.focus();
    }
});

// Close the mobile menu if the window grows back to desktop size
window.matchMedia('(min-width: 961px)').addEventListener('change', (event) => {
    if (event.matches) {
        setNavOpen(false);
    }
});

// ---------- Header shadow & back-to-top button ----------

const backToTop = document.querySelector('.back-to-top');

function onScroll() {
    header.classList.toggle('is-scrolled', window.scrollY > 10);
    backToTop.classList.toggle('is-visible', window.scrollY > 600);
}

window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// ---------- Highlight the nav link of the section in view ----------

const navLinks = [...nav.querySelectorAll('a:not(.btn)')];
const navSections = navLinks
    .map((link) => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);

const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (!entry.isIntersecting) {
            return;
        }
        navLinks.forEach((link) => {
            link.classList.toggle('is-active', link.getAttribute('href') === `#${entry.target.id}`);
        });
    });
}, { rootMargin: '-45% 0px -50% 0px' });

navSections.forEach((section) => sectionObserver.observe(section));

// ---------- Reveal sections on scroll ----------

const revealItems = document.querySelectorAll('.reveal');

function finishReveal(item) {
    // Drop the reveal classes so each card's own hover transitions apply again
    item.classList.remove('reveal', 'is-visible');
    item.style.transitionDelay = '';
}

if (prefersReducedMotion) {
    revealItems.forEach(finishReveal);
} else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) {
                return;
            }
            const item = entry.target;
            const siblings = [...item.parentElement.children].filter((child) => child.classList.contains('reveal'));
            item.style.transitionDelay = `${Math.min(siblings.indexOf(item), 5) * 90}ms`;
            item.classList.add('is-visible');
            item.addEventListener('transitionend', () => finishReveal(item), { once: true });
            observer.unobserve(item);
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    revealItems.forEach((item) => revealObserver.observe(item));
}

// ---------- Animated counters in the stats band ----------

function animateCounter(element) {
    const target = Number(element.dataset.count);
    const duration = 1600;
    const start = performance.now();

    function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        element.textContent = Math.round(target * eased).toLocaleString('en-US');
        if (progress < 1) {
            requestAnimationFrame(tick);
        }
    }

    requestAnimationFrame(tick);
}

if (!prefersReducedMotion) {
    const counterObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.6 });

    document.querySelectorAll('[data-count]').forEach((counter) => counterObserver.observe(counter));
}

// ---------- Pricing: monthly / yearly switch ----------

const billingToggle = document.querySelector('#billing-toggle');
const labelMonthly = document.querySelector('#label-monthly');
const labelYearly = document.querySelector('#label-yearly');

function setBilling(yearly) {
    billingToggle.setAttribute('aria-checked', String(yearly));
    labelMonthly.classList.toggle('is-current', !yearly);
    labelYearly.classList.toggle('is-current', yearly);

    document.querySelectorAll('.amount').forEach((amount) => {
        amount.textContent = yearly ? amount.dataset.yearly : amount.dataset.monthly;
    });
    document.querySelectorAll('.price-note').forEach((note) => {
        note.textContent = yearly ? 'Billed annually' : 'Billed monthly';
    });
}

billingToggle.addEventListener('click', () => {
    setBilling(billingToggle.getAttribute('aria-checked') !== 'true');
});
labelMonthly.addEventListener('click', () => setBilling(false));
labelYearly.addEventListener('click', () => setBilling(true));

// ---------- Contact form ----------
// The form is validated in the browser only. Connect it to your own backend
// or a form service (set the form's action/method) to actually receive messages.

const contactForm = document.querySelector('#contact-form');
const formSuccess = document.querySelector('#form-success');

const validators = {
    name: (value) => value.trim().length >= 2 || 'Please enter your name.',
    email: (value) => emailPattern.test(value.trim()) || 'Please enter a valid email address.',
    service: (value) => value !== '' || 'Please choose a service.',
    message: (value) => value.trim().length >= 10 || 'Please tell us a little more (at least 10 characters).',
};

function validateField(fieldName) {
    const input = contactForm.elements.namedItem(fieldName);
    const result = validators[fieldName](input.value);
    const error = result === true ? '' : result;

    document.querySelector(`#${fieldName}-error`).textContent = error;
    input.closest('.field').classList.toggle('has-error', Boolean(error));
    input.setAttribute('aria-invalid', String(Boolean(error)));
    return !error;
}

Object.keys(validators).forEach((fieldName) => {
    const input = contactForm.elements.namedItem(fieldName);
    const revalidate = () => {
        if (input.getAttribute('aria-invalid') === 'true') {
            validateField(fieldName);
        }
    };
    input.addEventListener('input', revalidate);
    input.addEventListener('change', revalidate);
});

contactForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const allValid = Object.keys(validators).map(validateField).every(Boolean);
    if (!allValid) {
        formSuccess.hidden = true;
        contactForm.querySelector('[aria-invalid="true"]').focus();
        return;
    }

    const firstName = contactForm.elements.namedItem('name').value.trim().split(/\s+/)[0];
    formSuccess.textContent = `Thank you, ${firstName}! We have received your message and will reply within one business day.`;
    formSuccess.hidden = false;
    contactForm.reset();
});

// ---------- Newsletter ----------

const newsletterForm = document.querySelector('#newsletter-form');
const newsletterMessage = document.querySelector('#newsletter-message');

newsletterForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const input = newsletterForm.querySelector('input');

    if (!emailPattern.test(input.value.trim())) {
        newsletterMessage.textContent = 'Please enter a valid email address.';
        input.focus();
        return;
    }

    newsletterMessage.textContent = 'Thanks for subscribing!';
    newsletterForm.reset();
});

// ---------- Footer year ----------

document.querySelector('#year').textContent = new Date().getFullYear();
