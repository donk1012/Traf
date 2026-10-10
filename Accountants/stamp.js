// "Hujjatga muhr bosing!": pick a stamp, then click the invoice to stamp it.
// Stamps already on the paper keep their wording when the language changes, like real ink.
// Uses t() from script.js.
(() => {
    const paper = document.querySelector('#stamp-paper');
    if (!paper) {
        return;
    }

    const MAX_STAMPS = 80;
    const INKS = { seal: 'var(--ink-blue)', approved: 'var(--ink-blue)', paid: 'var(--ink-red)', copy: 'var(--ink-violet)' };
    const WORDS = { approved: 'stampApproved', paid: 'stampPaid', copy: 'stampCopy' };

    const layer = document.querySelector('#paper-stamps');
    const spot = paper.querySelector('.stamp-spot');
    const options = document.querySelectorAll('.stamp-option');
    const countText = document.querySelector('#stamp-count');
    const statusText = document.querySelector('#stamp-status');
    const clearButton = document.querySelector('#stamp-clear');
    const calmMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let selected = 'seal';
    let count = 0;
    let uid = 0;
    let statusKey = '';

    // Today's date as on Uzbek and Russian documents: 10.10.2026
    const now = new Date();
    const today = [now.getDate(), now.getMonth() + 1].map((n) => String(n).padStart(2, '0')).join('.') + `.${now.getFullYear()}`;
    document.querySelector('#paper-date').textContent = today;

    // ---------- Stamp artwork (SVG) ----------

    function inkFilter(filterId) {
        return filterId ? ` filter="url(#${filterId})"` : '';
    }

    // Round company seal with the name running around the edge
    function sealSvg(filterId) {
        uid += 1;
        const arcId = `seal-arc-${uid}`;
        return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <defs><path id="${arcId}" d="M100,100 m-71,0 a71,71 0 1,1 142,0 a71,71 0 1,1 -142,0"/></defs>
            <g${inkFilter(filterId)}>
                <circle cx="100" cy="100" r="94" fill="none" stroke="currentColor" stroke-width="5"/>
                <circle cx="100" cy="100" r="85" fill="none" stroke="currentColor" stroke-width="2"/>
                <circle cx="100" cy="100" r="55" fill="none" stroke="currentColor" stroke-width="2.5"/>
                <text font-size="16" font-weight="800" fill="currentColor" textLength="440" lengthAdjust="spacing"><textPath href="#${arcId}">GOOD CONSULT SERVICE • ${t('stampCity')} •</textPath></text>
                <text x="100" y="106" text-anchor="middle" font-size="40" font-weight="800" fill="currentColor">GC</text>
                <text x="100" y="128" text-anchor="middle" font-size="8.5" font-weight="800" letter-spacing="1" fill="currentColor">${t('stampDept')}</text>
            </g>
        </svg>`;
    }

    // Rectangular office stamp with a word and today's date
    function rectSvg(wordKey, filterId) {
        const word = t(wordKey);
        const size = Math.min(30, 214 / (word.length * 0.74)).toFixed(1);
        return `<svg viewBox="0 0 260 104" xmlns="http://www.w3.org/2000/svg">
            <g${inkFilter(filterId)}>
                <rect x="4" y="4" width="252" height="96" rx="12" fill="none" stroke="currentColor" stroke-width="5"/>
                <rect x="13" y="13" width="234" height="78" rx="6" fill="none" stroke="currentColor" stroke-width="2"/>
                <text x="130" y="56" text-anchor="middle" font-size="${size}" font-weight="800" letter-spacing="1.5" fill="currentColor">${word}</text>
                <text x="130" y="80" text-anchor="middle" font-size="15" font-weight="700" letter-spacing="2" fill="currentColor">${today}</text>
            </g>
        </svg>`;
    }

    function stampSvg(type, filterId) {
        return type === 'seal' ? sealSvg(filterId) : rectSvg(WORDS[type], filterId);
    }

    function renderPreviews() {
        options.forEach((option) => {
            const preview = option.querySelector('.stamp-preview');
            preview.style.color = INKS[option.dataset.stamp];
            preview.innerHTML = stampSvg(option.dataset.stamp, '');
        });
    }

    function renderText() {
        countText.textContent = t('stampCount').replace('{n}', count);
        statusText.textContent = statusKey ? t(statusKey) : '';
    }

    // ---------- Stamping ----------

    // The paper is tilted a little, so turn screen coordinates back into the paper's own
    function toPaper(clientX, clientY) {
        const rect = paper.getBoundingClientRect();
        const tilt = (parseFloat(getComputedStyle(paper).getPropertyValue('--paper-tilt')) || 0) * Math.PI / 180;
        const dx = clientX - (rect.left + rect.width / 2);
        const dy = clientY - (rect.top + rect.height / 2);
        return {
            x: dx * Math.cos(tilt) + dy * Math.sin(tilt) + paper.offsetWidth / 2,
            y: -dx * Math.sin(tilt) + dy * Math.cos(tilt) + paper.offsetHeight / 2,
        };
    }

    function spotCenter() {
        return { x: spot.offsetLeft + spot.offsetWidth / 2, y: spot.offsetTop + spot.offsetHeight / 2 };
    }

    function placeStamp(x, y) {
        const stamp = document.createElement('div');
        stamp.className = `stamp ${selected === 'seal' ? 'stamp-round' : 'stamp-rect'}`;
        stamp.style.left = `${(x / paper.offsetWidth) * 100}%`;
        stamp.style.top = `${(y / paper.offsetHeight) * 100}%`;
        stamp.style.color = INKS[selected];
        stamp.style.setProperty('--angle', `${(Math.random() * 30 - 15).toFixed(1)}deg`);
        stamp.style.setProperty('--ink-opacity', (0.78 + Math.random() * 0.17).toFixed(2));
        stamp.innerHTML = stampSvg(selected, `ink-${1 + Math.floor(Math.random() * 3)}`);
        layer.append(stamp);
        if (layer.children.length > MAX_STAMPS) {
            layer.firstElementChild.remove();
        }

        count += 1;
        const center = spotCenter();
        const onSpot = Math.hypot(x - center.x, y - center.y) <= spot.offsetWidth * 0.6;
        statusKey = onSpot ? 'stampOnSpot' : '';
        renderText();

        if (!calmMotion) {
            paper.classList.remove('is-hit');
            void paper.offsetWidth; // restart the animation
            paper.classList.add('is-hit');
        }
    }

    paper.addEventListener('click', (event) => {
        const point = toPaper(event.clientX, event.clientY);
        placeStamp(point.x, point.y);
    });

    // Keyboard: Enter or Space stamps the "M.O‘." spot (place for the stamp)
    paper.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            const center = spotCenter();
            placeStamp(center.x + Math.random() * 24 - 12, center.y + Math.random() * 16 - 8);
        }
    });

    options.forEach((option) => {
        option.addEventListener('click', () => {
            selected = option.dataset.stamp;
            options.forEach((other) => other.setAttribute('aria-pressed', String(other === option)));
        });
    });

    clearButton.addEventListener('click', () => {
        layer.replaceChildren();
        count = 0;
        statusKey = 'stampCleared';
        renderText();
    });

    document.addEventListener('gcs:language', () => {
        renderPreviews();
        renderText();
    });

    renderPreviews();
    renderText();
})();
