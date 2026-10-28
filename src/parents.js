import './parents.css';

const SESSION_MS = 5 * 60 * 1000;
const NUMBER_WORDS = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
const fa = (value) => value.toLocaleString('fa-IR');
let fallbackSeed = Date.now() % 2147483647 || 1;
const lockIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/></svg>';
const closeIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg>';

// Independent from the quiz's random source, so opening settings cannot change
// seeded questions or the order of game rounds.
function randomIndex(length) {
  if (globalThis.crypto?.getRandomValues) return globalThis.crypto.getRandomValues(new Uint32Array(1))[0] % length;
  fallbackSeed = fallbackSeed * 16807 % 2147483647;
  return fallbackSeed % length;
}
function shuffled(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index--) {
    const next = randomIndex(index + 1);
    [copy[index], copy[next]] = [copy[next], copy[index]];
  }
  return copy;
}

const PRIVACY = `<p>این مجموعه برای کودکان حدود ۳ تا ۵ سال و همراهی خانواده طراحی شده است. بازی‌ها، تصویرها، فونت و ضبط‌های صدای حیوانات همراه اپ روی دستگاه اجرا می‌شوند.</p>
  <h3>اطلاعات کودک</h3><p>اپ حساب کاربری، تبلیغات، ردیابی رفتاری یا تحلیل‌گر ندارد. نام، سن، تصویر، صدای میکروفن، موقعیت مکانی، شناسهٔ تبلیغاتی و پاسخ‌های کودک را جمع‌آوری یا به سرور ارسال نمی‌کند.</p>
  <h3>تنظیمات روی همین دستگاه</h3><p>فقط ترجیحات برنامه، مانند بلندی صدا و روشن یا خاموش بودن راهنما، در حافظهٔ محلی دستگاه ذخیره می‌شوند. بازنشانی تنظیمات از بخش والدین و حذف برنامه، این ترجیحات را پاک می‌کند. پروندهٔ کودک یا گزارش عملکرد ابری وجود ندارد.</p>
  <h3>صدا و دسترسی‌ها</h3><p>برای بازی نیازی به دوربین، میکروفن، موقعیت مکانی، مخاطبان یا ثبت‌نام نیست. راهنماهای تصویری همیشه در دسترس‌اند. راهنمای صوتی، در نسخه‌ها و دستگاه‌های پشتیبانی‌شده، فقط از فایل همراه اپ یا صدای محلی نصب‌شدهٔ دستگاه استفاده می‌کند و ممکن است در بعضی دستگاه‌ها در دسترس نباشد. اپ از سرویس گفتار ابری استفاده نمی‌کند و صدای کودک را ضبط نمی‌کند.</p>
  <h3>پیوندهای بیرونی</h3><p>پیوند منابع فقط با اقدام بزرگسال در مرورگر باز می‌شود. مراجعه به وب‌سایت بیرونی ممکن است به اینترنت نیاز داشته باشد و تابع سیاست حریم خصوصی همان وب‌سایت و مرورگر است.</p>
  <h3>همراهی بزرگسال</h3><p>ورود به این بخش یک مانع مناسب محیط کودک است؛ احراز هویت بزرگسال یا رضایت قانونی والد محسوب نمی‌شود. اپ برای آموزش و بازی پیشنهاد شده و ابزار تشخیص یا ارزیابی پزشکی رشد نیست.</p>`;

/**
 * Memory-only parental area. Every privileged action is passed through request().
 * This is a reading-based child gate, not age verification or parental consent.
 */
export function createParentArea({
  mount = document.body,
  onPause = () => {},
  onResume = () => {},
  onOpenSettings = () => {},
  onOpenCredits = () => {},
  onExternal = () => {},
  onResetPreferences = () => {},
  publisher = {},
} = {}) {
  const container = document.createElement('div');
  container.className = 'parent-area';
  container.innerHTML = `
    <dialog class="parent-modal parent-gate" id="parent-gate" aria-labelledby="parent-gate-title" aria-describedby="parent-gate-description">
      <button class="parent-icon-button parent-close" id="parent-gate-cancel" aria-label="برگشت به بازی">${closeIcon}</button>
      <span class="parent-lock" aria-hidden="true">${lockIcon}</span>
      <h2 id="parent-gate-title" tabindex="-1">این بخش برای بزرگ‌ترهاست</h2>
      <p id="parent-gate-description">لطفاً گوشی را به یک بزرگ‌تر بدهید. برای ادامه، عددهای زیر را به همان ترتیب لمس کنید.</p>
      <p id="parent-gate-instruction" class="parent-sequence"></p>
      <div id="parent-gate-progress" class="parent-progress" aria-label="هنوز عددی انتخاب نشده"></div>
      <div id="parent-gate-keys" class="parent-number-grid" role="group" aria-label="عددها"></div>
      <p id="parent-gate-status" class="parent-status" role="status" aria-live="polite"></p>
      <button class="parent-text-button" id="parent-gate-return">برگشت به بازی</button>
    </dialog>
    <dialog class="parent-modal parent-dashboard" id="parents-dialog" aria-labelledby="parents-title">
      <button class="parent-icon-button parent-close" id="parents-close" aria-label="بستن بخش والدین">${closeIcon}</button>
      <span class="parent-eyebrow">باغ بازی‌های کوچولو · برای خانواده</span>
      <h2 id="parents-title" tabindex="-1">همراه کوچولوی شما</h2>
      <p>بازی‌های کوتاه برای حدود ۳ تا ۵ سال؛ بدون تبلیغات، حساب کاربری یا خرید درون‌برنامه‌ای. راهنماها تصویری‌اند و همراهی شما فرصت گفت‌وگو و تمرین واقعی می‌سازد.</p>
      <div class="parent-action-grid">
        <button class="parent-action" id="parents-settings"><strong>صدا و تنظیمات</strong><span>ترجیحات همین دستگاه</span></button>
        <button class="parent-action" id="parents-credits"><strong>منابع و مجوزها</strong><span>اطلاعات دارایی‌های برنامه</span></button>
        <button class="parent-action" id="parents-privacy"><strong>حریم خصوصی</strong><span>بدون نیاز به اینترنت بخوانید</span></button>
        <button class="parent-action" id="parents-reset"><strong>بازنشانی تنظیمات</strong><span>بازگشت به ترجیحات اولیه</span></button>
      </div>
      <div class="parent-play-note"><strong>بیرون از صفحه هم بازی کنیم</strong><p>بعد از شناخت شکل، یک شیء هم‌شکل در خانه پیدا کنید؛ بعد از ناهار سه دوست، برای سه عروسک واقعی یک خوراکی اسباب‌بازی بگذارید. بازی با اشیای درشت و مناسب سن و با همراهی بزرگسال انجام شود.</p></div>
      <div class="parent-publisher" id="parent-publisher"><h3>ناشر و پشتیبانی</h3><p data-parent-publisher-name></p><p data-parent-support-email dir="ltr"></p><p data-parent-publisher-status></p></div>
      <p class="parent-gate-note">دسترسی والدین حداکثر پنج دقیقه باز می‌ماند؛ با برگشت به بازی یا رفتن برنامه به پس‌زمینه، دوباره قفل می‌شود.</p>
      <p id="parents-status" class="parent-status" role="status" aria-live="polite"></p>
    </dialog>
    <dialog class="parent-modal parent-privacy" id="parent-privacy-dialog" aria-labelledby="parent-privacy-title">
      <button class="parent-icon-button parent-close" id="parent-privacy-close" aria-label="برگشت به بخش والدین">${closeIcon}</button>
      <span class="parent-eyebrow">آخرین بازبینی: ۲۸ اکتبر ۲۰۲۶</span>
      <h2 id="parent-privacy-title" tabindex="-1">حریم خصوصی</h2>
      <div class="parent-policy-copy">${PRIVACY}<h3>تماس با ناشر</h3><p data-parent-privacy-contact></p></div>
      <button class="parent-primary-button" id="parent-privacy-back">برگشت به بخش والدین</button>
    </dialog>
    <dialog class="parent-modal parent-reset" id="parent-reset-dialog" aria-labelledby="parent-reset-title">
      <h2 id="parent-reset-title" tabindex="-1">تنظیمات به حالت اول برگردد؟</h2>
      <p>فقط ترجیحات همین دستگاه، مانند بلندی صدا و راهنما، بازنشانی می‌شوند. پاسخ‌ها و پرونده‌ای از کودک ذخیره نشده است.</p>
      <button class="parent-primary-button" id="parent-reset-confirm">بله، تنظیمات بازنشانی شود</button>
      <button class="parent-text-button" id="parent-reset-cancel">انصراف</button>
    </dialog>`;
  mount.append(container);
  const $ = (selector) => container.querySelector(selector);
  const dialogs = [...container.querySelectorAll('dialog')];
  const gate = $('#parent-gate');
  const dashboard = $('#parents-dialog');
  const privacy = $('#parent-privacy-dialog');
  const reset = $('#parent-reset-dialog');
  const events = new AbortController();
  let authorizedUntil = 0;
  let sessionTimer;
  let pendingAction = null;
  let expected = [];
  let entered = [];
  let opener;
  let destroyed = false;
  let actionGeneration = 0;
  let publisherInfo = publisher || {};

  const hasSession = () => !destroyed && authorizedUntil > Date.now();
  const hasDialog = () => dialogs.some((dialog) => dialog.open);

  function updatePublisher(next = publisherInfo) {
    publisherInfo = next || {};
    const name = typeof publisherInfo.name === 'string' ? publisherInfo.name.trim() : '';
    const email = typeof publisherInfo.supportEmail === 'string' ? publisherInfo.supportEmail.trim() : '';
    $('[data-parent-publisher-name]').textContent = name || 'ناشر هنوز معرفی نشده است.';
    $('[data-parent-support-email]').textContent = email;
    $('[data-parent-support-email]').hidden = !email;
    $('[data-parent-publisher-status]').textContent = name && email ? '' : 'اطلاعات ناشر پیش از انتشار تکمیل می‌شود.';
    $('[data-parent-publisher-status]').hidden = Boolean(name && email);
    $('#parent-publisher').dataset.publicationStatus = name && email ? 'configured' : 'unconfigured';
    $('[data-parent-privacy-contact]').textContent = email ? `${name || 'ناشر برنامه'} — ${email}` : 'اطلاعات تماس ناشر پیش از انتشار عمومی تکمیل می‌شود.';
  }

  function closeOwned() {
    for (const dialog of dialogs) if (dialog.open) dialog.close();
  }

  function afterClose() {
    queueMicrotask(() => {
      if (destroyed || document.hidden || hasDialog() || document.querySelector('dialog[open]')) return;
      onResume();
      const openerDialog = opener?.closest('dialog');
      if (opener?.isConnected && !opener.closest('[hidden]') && (!openerDialog || openerDialog.open)) opener.focus({ preventScroll: true });
    });
  }

  function show(dialog) {
    closeOwned();
    dialog.showModal();
    dialog.querySelector('h2')?.focus({ preventScroll: true });
  }

  function progress() {
    $('#parent-gate-progress').innerHTML = [0, 1, 2].map((index) => `<span class="parent-progress-dot" data-complete="${index < entered.length}" aria-hidden="true">${index < entered.length ? fa(entered[index]) : '·'}</span>`).join('');
    $('#parent-gate-progress').setAttribute('aria-label', `${fa(entered.length)} عدد از سه عدد انتخاب شده`);
  }

  function challenge(message = '') {
    expected = shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 3);
    const others = shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9].filter((number) => !expected.includes(number))).slice(0, 3);
    entered = [];
    $('#parent-gate-instruction').innerHTML = expected.map((number) => `<span data-parent-step-word>${NUMBER_WORDS[number]}</span>`).join('<span class="parent-sequence-then" aria-hidden="true">سپس</span>');
    $('#parent-gate-keys').innerHTML = shuffled([...expected, ...others]).map((number) => `<button class="parent-number" data-parent-digit="${number}" aria-label="${NUMBER_WORDS[number]}">${fa(number)}</button>`).join('');
    $('#parent-gate-status').textContent = message;
    progress();
  }

  function fail(error) {
    if (!hasSession() || document.hidden) return;
    show(dashboard);
    $('#parents-status').textContent = 'باز کردن این بخش ممکن نشد؛ لطفاً دوباره امتحان کنید.';
    // Never expose callback error details, URLs or device information in the UI.
    void error;
  }

  function execute(action) {
    const generation = ++actionGeneration;
    const onError = (error) => { if (generation === actionGeneration) fail(error); };
    try {
      const result = action();
      if (result?.catch) result.catch(onError);
    } catch (error) { onError(error); }
  }

  function request(action) {
    if (destroyed || typeof action !== 'function') return false;
    onPause();
    if (hasSession()) {
      execute(action);
      return true;
    }
    // An expired session cannot leave privileged settings or credits underneath
    // the new gate, including when an external source link was clicked there.
    opener = document.activeElement;
    for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close();
    pendingAction = action;
    gate.returnValue = '';
    challenge();
    show(gate);
    return false;
  }

  function open() {
    return request(() => { updatePublisher(); $('#parents-status').textContent = ''; show(dashboard); });
  }

  function openSettings() {
    return request(() => { closeOwned(); onOpenSettings(); });
  }

  function openCredits() {
    return request(() => { closeOwned(); onOpenCredits(); });
  }

  function openExternal(value) {
    let url;
    try {
      url = new URL(value);
      if (url.protocol !== 'https:' || url.username || url.password) return false;
    } catch { return false; }
    return request(() => onExternal(url.href));
  }

  function close() {
    lock();
  }

  function lock() {
    actionGeneration++;
    authorizedUntil = 0;
    pendingAction = null;
    clearTimeout(sessionTimer);
    closeOwned();
    for (const id of ['settings-dialog', 'credits-dialog']) {
      const dialog = document.getElementById(id);
      if (dialog?.open) dialog.close();
    }
  }

  function backToDashboard() {
    if (hasSession()) show(dashboard);
    else close();
  }

  function handleBack() {
    if (privacy.open || reset.open) { backToDashboard(); return true; }
    if (hasDialog()) { close(); return true; }
    return false;
  }

  $('#parent-gate-keys').addEventListener('click', (event) => {
    const button = event.target.closest('[data-parent-digit]');
    if (!button || !gate.open || !pendingAction) return;
    const number = Number(button.dataset.parentDigit);
    if (number !== expected[entered.length]) {
      challenge('ترتیب درست نبود؛ لطفاً یک بزرگ‌تر راهنما را بخواند و دوباره ادامه دهد.');
      return;
    }
    entered.push(number);
    progress();
    if (entered.length !== expected.length) return;
    const action = pendingAction;
    pendingAction = null;
    authorizedUntil = Date.now() + SESSION_MS;
    clearTimeout(sessionTimer);
    sessionTimer = setTimeout(lock, SESSION_MS);
    gate.close('approved');
    execute(action);
  }, { signal: events.signal });
  for (const id of ['parent-gate-cancel', 'parent-gate-return', 'parents-close']) $('#'+id).addEventListener('click', close, { signal: events.signal });
  $('#parents-settings').addEventListener('click', openSettings, { signal: events.signal });
  $('#parents-credits').addEventListener('click', openCredits, { signal: events.signal });
  $('#parents-privacy').addEventListener('click', () => request(() => { updatePublisher(); show(privacy); }), { signal: events.signal });
  $('#parents-reset').addEventListener('click', () => request(() => show(reset)), { signal: events.signal });
  for (const id of ['parent-privacy-close', 'parent-privacy-back', 'parent-reset-cancel']) $('#'+id).addEventListener('click', backToDashboard, { signal: events.signal });
  $('#parent-reset-confirm').addEventListener('click', () => request(() => {
    onResetPreferences();
    show(dashboard);
    $('#parents-status').textContent = 'تنظیمات همین دستگاه به حالت اولیه برگشت.';
  }), { signal: events.signal });

  for (const dialog of dialogs) {
    dialog.addEventListener('close', () => { if (dialog === gate && !gate.open && dialog.returnValue !== 'approved') pendingAction = null; afterClose(); }, { signal: events.signal });
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      if (dialog === privacy || dialog === reset) backToDashboard();
      else close();
    }, { signal: events.signal });
    dialog.addEventListener('click', (event) => {
      if (event.target !== dialog) return;
      const box = dialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) {
        if (dialog === privacy || dialog === reset) backToDashboard(); else close();
      }
    }, { signal: events.signal });
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) lock(); }, { signal: events.signal });
  updatePublisher();

  return {
    open, request, openSettings, openCredits, openExternal,
    lock, close, handleBack, hasSession, setPublisher: updatePublisher,
    destroy() { destroyed = true; clearTimeout(sessionTimer); events.abort(); closeOwned(); container.remove(); },
  };
}
