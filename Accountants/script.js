const root = document.documentElement;
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Google Apps Script web app that passes the forms on to Telegram (see telegram-bot/SETUP.md).
// While it is empty, the forms only show their thank-you message and send nothing.
const FORM_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyKITSEXusm1qKXecnNaxOI8wrFVFvRngXqQPZe4ktuNj1zJIhLdtRmOVYw2Nwpr75Qvw/exec';

const LANG_KEY = 'gcs-lang';
const THEME_KEY = 'gcs-theme';

function saveSetting(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (error) {
        // Storage can be blocked (private mode); the choice then lasts for this visit only
    }
}

function readSetting(key) {
    try {
        return localStorage.getItem(key);
    } catch (error) {
        return null;
    }
}

// ---------- Language: Uzbek (default, written in index.html) / Russian ----------

const i18nElements = document.querySelectorAll('[data-i18n]');
const i18nAttrElements = document.querySelectorAll('[data-i18n-attr]');
const langButtons = document.querySelectorAll('.lang-switch [data-lang]');
let currentLang = 'uz';

// "aria-label:key, placeholder:key2" -> [['aria-label', 'key'], ['placeholder', 'key2']]
function parseAttrList(value) {
    return value.split(',').map((pair) => pair.split(':').map((part) => part.trim()));
}

// Keep the Uzbek text from the HTML so we can switch back to it
const uzText = new Map();
i18nElements.forEach((element) => uzText.set(element, element.innerHTML));

const uzAttrs = new Map();
i18nAttrElements.forEach((element) => {
    const values = {};
    parseAttrList(element.dataset.i18nAttr).forEach(([attr]) => {
        values[attr] = element.getAttribute(attr);
    });
    uzAttrs.set(element, values);
});

function t(key) {
    return messages[currentLang][key];
}

function setLanguage(lang) {
    currentLang = lang;
    root.lang = lang;
    root.dataset.lang = lang;
    const dictionary = lang === 'uz' ? {} : translations[lang];

    i18nElements.forEach((element) => {
        element.innerHTML = dictionary[element.dataset.i18n] ?? uzText.get(element);
    });

    i18nAttrElements.forEach((element) => {
        parseAttrList(element.dataset.i18nAttr).forEach(([attr, key]) => {
            element.setAttribute(attr, dictionary[key] ?? uzAttrs.get(element)[attr]);
        });
    });

    langButtons.forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.lang === lang));
    });

    // Text that the script itself writes
    updateNavToggleLabel();
    updateBillingNotes();
    refreshFormMessages();
    document.dispatchEvent(new CustomEvent('gcs:language'));
}

langButtons.forEach((button) => {
    button.addEventListener('click', () => {
        setLanguage(button.dataset.lang);
        saveSetting(LANG_KEY, button.dataset.lang);
    });
});

// ---------- Light / dark theme ----------

const themeToggle = document.querySelector('.theme-toggle');

function applyTheme(theme) {
    root.dataset.theme = theme;
    themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
}

themeToggle.addEventListener('click', () => {
    const nextTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    saveSetting(THEME_KEY, nextTheme);
});

// Follow the system setting until the visitor picks a theme themselves
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
    if (!readSetting(THEME_KEY)) {
        applyTheme(event.matches ? 'dark' : 'light');
    }
});

// ---------- Mobile navigation ----------

const header = document.querySelector('.site-header');
const navToggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('#site-nav');

function updateNavToggleLabel() {
    const open = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-label', t(open ? 'navClose' : 'navOpen'));
}

function setNavOpen(open) {
    navToggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('nav-open', open);
    updateNavToggleLabel();
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
window.matchMedia('(min-width: 1181px)').addEventListener('change', (event) => {
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

// 1200 -> "1 200" (non-breaking space, as written in Uzbek and Russian)
function formatNumber(number) {
    return String(number).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function animateCounter(element) {
    const target = Number(element.dataset.count);
    const duration = 1600;
    const start = performance.now();

    function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        element.textContent = formatNumber(Math.round(target * eased));
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

function isYearly() {
    return billingToggle.getAttribute('aria-checked') === 'true';
}

function updateBillingNotes() {
    document.querySelectorAll('.price-note').forEach((note) => {
        note.textContent = t(isYearly() ? 'billingYearly' : 'billingMonthly');
    });
}

function setBilling(yearly) {
    billingToggle.setAttribute('aria-checked', String(yearly));
    labelMonthly.classList.toggle('is-current', !yearly);
    labelYearly.classList.toggle('is-current', yearly);

    document.querySelectorAll('.amount').forEach((amount) => {
        amount.textContent = yearly ? amount.dataset.yearly : amount.dataset.monthly;
    });
    updateBillingNotes();
}

billingToggle.addEventListener('click', () => setBilling(!isYearly()));
labelMonthly.addEventListener('click', () => setBilling(false));
labelYearly.addEventListener('click', () => setBilling(true));

// ---------- Sending forms ----------

async function sendForm(payload) {
    if (!FORM_ENDPOINT) {
        console.warn('FORM_ENDPOINT is empty, so this form was not sent anywhere.');
        return;
    }
    // A plain-text body keeps this a "simple" request, which Apps Script accepts from any site
    const response = await fetch(FORM_ENDPOINT, { method: 'POST', body: JSON.stringify(payload) });
    const result = await response.json();
    if (!result.ok) {
        throw new Error(result.error || 'send_failed');
    }
}

// ---------- Contact form ----------

const contactForm = document.querySelector('#contact-form');
const contactSubmit = contactForm.querySelector('[type="submit"]');
const formStatus = document.querySelector('#form-status');
let contactState = ''; // '', 'sending', 'success' or 'error'
let submittedName = '';

// Numbers copied from phone contacts or messengers can carry invisible direction marks
function cleanPhone(value) {
    return value.replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/g, '').trim();
}

// Digits, spaces, "+", "-" and brackets only. Uzbek numbers with the 998 country code
// need all 12 digits; local and foreign numbers need 9 to 15.
function isPhoneNumber(value) {
    const phone = cleanPhone(value);
    const digits = phone.replace(/\D/g, '');
    if (!/^\+?[\d\s()-]+$/.test(phone)) {
        return false;
    }
    if (phone.startsWith('+998') || (digits.startsWith('998') && digits.length > 9)) {
        return digits.length === 12;
    }
    return digits.length >= 9 && digits.length <= 15;
}

// Each check returns true, or the key of the error message in `messages`
const validators = {
    name: (value) => value.trim().length >= 2 || 'errorName',
    phone: (value) => (cleanPhone(value) === '' ? 'errorPhone' : isPhoneNumber(value) || 'errorPhoneInvalid'),
    email: (value) => value.trim() === '' || emailPattern.test(value.trim()) || 'errorEmail',
    service: (value) => value !== '' || 'errorService',
    message: (value) => value.trim().length >= 10 || 'errorMessage',
};

function validateField(fieldName) {
    const input = contactForm.elements.namedItem(fieldName);
    const result = validators[fieldName](input.value);
    const error = result === true ? '' : t(result);

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

function showContactStatus() {
    const keys = { sending: 'sending', success: 'formSuccess', error: 'errorSend' };
    formStatus.hidden = !contactState;
    formStatus.className = `form-status is-${contactState}`;
    formStatus.textContent = contactState ? t(keys[contactState]).replace('{name}', submittedName) : '';
}

contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (contactState === 'sending') {
        return;
    }

    const allValid = Object.keys(validators).map(validateField).every(Boolean);
    if (!allValid) {
        contactState = '';
        showContactStatus();
        contactForm.querySelector('[aria-invalid="true"]').focus();
        return;
    }

    const field = (name) => contactForm.elements.namedItem(name);
    submittedName = field('name').value.trim().split(/\s+/)[0];
    contactState = 'sending';
    contactSubmit.disabled = true;
    showContactStatus();

    try {
        await sendForm({
            type: 'contact',
            name: field('name').value.trim(),
            email: field('email').value.trim(),
            phone: cleanPhone(field('phone').value),
            service: field('service').selectedOptions[0].textContent,
            message: field('message').value.trim(),
            lang: currentLang,
            website: field('website').value,
        });
        contactState = 'success';
        contactForm.reset();
    } catch (error) {
        console.error(error);
        contactState = 'error';
    }
    contactSubmit.disabled = false;
    showContactStatus();
});

// ---------- Newsletter ----------

const newsletterForm = document.querySelector('#newsletter-form');
const newsletterInput = newsletterForm.querySelector('input');
const newsletterButton = newsletterForm.querySelector('button');
const newsletterMessage = document.querySelector('#newsletter-message');
let newsletterState = ''; // '', 'invalid', 'sending', 'success' or 'error'

function showNewsletterMessage() {
    const keys = { invalid: 'errorEmail', sending: 'sending', success: 'newsletterSuccess', error: 'newsletterError' };
    newsletterMessage.textContent = newsletterState ? t(keys[newsletterState]) : '';
}

newsletterForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (newsletterState === 'sending') {
        return;
    }

    if (!emailPattern.test(newsletterInput.value.trim())) {
        newsletterState = 'invalid';
        showNewsletterMessage();
        newsletterInput.focus();
        return;
    }

    newsletterState = 'sending';
    newsletterButton.disabled = true;
    showNewsletterMessage();

    try {
        await sendForm({ type: 'newsletter', email: newsletterInput.value.trim(), lang: currentLang });
        newsletterState = 'success';
        newsletterForm.reset();
    } catch (error) {
        console.error(error);
        newsletterState = 'error';
    }
    newsletterButton.disabled = false;
    showNewsletterMessage();
});

// Re-show any visible form messages in the newly chosen language
function refreshFormMessages() {
    Object.keys(validators).forEach((fieldName) => {
        if (contactForm.elements.namedItem(fieldName).getAttribute('aria-invalid') === 'true') {
            validateField(fieldName);
        }
    });
    showContactStatus();
    showNewsletterMessage();
}

// ---------- Start-up ----------

document.querySelector('#year').textContent = new Date().getFullYear();
applyTheme(root.dataset.theme === 'dark' ? 'dark' : 'light');
setLanguage(root.dataset.lang === 'ru' ? 'ru' : 'uz');
root.classList.remove('i18n-pending');
