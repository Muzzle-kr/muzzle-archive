const slides = Array.from(document.querySelectorAll(".slide"));
const dotsContainer = document.getElementById("dots");
const counter = document.getElementById("counter");
const practiceTimerDisplays = Array.from(document.querySelectorAll("[data-practice-timer-display]"));
const practiceTimerToggle = document.getElementById("practice-timer-toggle");
const copyNotionSkillPromptButton = document.getElementById("copy-notion-skill-prompt");
const notionSkillInstallPrompt = document.getElementById("notion-skill-install-prompt");

let current = 0;
let touchStartX = 0;
let touchStartY = 0;
let practiceTimerId = null;
let practiceTimerStartedAt = 0;
const practiceTimerDuration = 15 * 60;
let practiceTimerRemaining = practiceTimerDuration;
let practiceTimerRunning = false;

function formatIndex(index) {
  return String(index + 1).padStart(2, "0");
}

function setFragmentsVisible(slide, visible) {
  slide.querySelectorAll(".fragment").forEach((fragment) => {
    fragment.classList.toggle("visible", visible);
  });
}

function syncSlideMeta() {
  slides.forEach((slide, index) => {
    const slideIndex = slide.querySelector(".slide-index");
    if (slideIndex) {
      slideIndex.textContent = formatIndex(index);
    }
  });
}

function createDots() {
  slides.forEach((slide, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = `nav-dot${index === current ? " active" : ""}`;
    dot.setAttribute("aria-label", `${index + 1}. ${slide.dataset.title || "Slide"}`);
    dot.addEventListener("click", () => goTo(index, true));
    dotsContainer?.appendChild(dot);
  });
}

function updateNav() {
  const dots = Array.from(document.querySelectorAll(".nav-dot"));
  dots.forEach((dot, index) => {
    dot.classList.toggle("active", index === current);
  });

  if (counter) {
    counter.textContent = `${current + 1} / ${slides.length}`;
  }

  window.history.replaceState(null, "", `#slide-${formatIndex(current)}`);
}

function resetNonActiveSlides(prev, next) {
  slides.forEach((slide, index) => {
    if (index !== prev && index !== next) {
      slide.classList.remove("is-active", "exit-left", "exit-right");
      slide.style.transform = "";
    }
  });
}

function resetSlideScroll(slide) {
  if (!slide) return;
  slide.scrollTop = 0;
  slide.scrollLeft = 0;
}

function scrollCurrentSlideBy(deltaY) {
  slides[current]?.scrollBy({
    top: deltaY,
    left: 0,
    behavior: "smooth",
  });
}

function goTo(index, showFragments = true) {
  const nextIndex = Math.max(0, Math.min(index, slides.length - 1));
  if (nextIndex === current) return;

  const direction = nextIndex > current ? 1 : -1;
  const previous = current;
  current = nextIndex;

  resetNonActiveSlides(previous, current);
  resetSlideScroll(slides[current]);

  slides[previous].classList.remove("is-active");
  slides[previous].classList.add(direction > 0 ? "exit-left" : "exit-right");

  slides[current].classList.remove("exit-left", "exit-right");
  slides[current].style.transform = direction > 0 ? "translateX(40px)" : "translateX(-40px)";

  if (showFragments) {
    setFragmentsVisible(slides[current], true);
  } else {
    setFragmentsVisible(slides[current], false);
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      slides[current].classList.add("is-active");
      slides[current].style.transform = "";
    });
  });

  updateNav();
}

function next() {
  const hiddenFragments = slides[current].querySelectorAll(".fragment:not(.visible)");
  if (hiddenFragments.length > 0) {
    hiddenFragments[0].classList.add("visible");
    return;
  }

  if (current < slides.length - 1) {
    goTo(current + 1, false);
  }
}

function prev() {
  const visibleFragments = Array.from(slides[current].querySelectorAll(".fragment.visible"));
  if (visibleFragments.length > 0) {
    visibleFragments[visibleFragments.length - 1].classList.remove("visible");
    return;
  }

  if (current > 0) {
    goTo(current - 1, true);
  }
}

function handleKeydown(event) {
  if (["BUTTON", "INPUT", "TEXTAREA", "SELECT"].includes(event.target?.tagName)) {
    return;
  }

  if (["ArrowRight", "PageDown", " ", "j", "J"].includes(event.key)) {
    event.preventDefault();
    next();
  }

  if (["ArrowLeft", "PageUp", "k", "K"].includes(event.key)) {
    event.preventDefault();
    prev();
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    scrollCurrentSlideBy(Math.round(window.innerHeight * 0.22));
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    scrollCurrentSlideBy(-Math.round(window.innerHeight * 0.22));
  }

  if (event.key === "Home") {
    event.preventDefault();
    goTo(0, true);
  }

  if (event.key === "End") {
    event.preventDefault();
    goTo(slides.length - 1, true);
  }
}

function handleHash() {
  const rawHash = window.location.hash.replace("#", "");
  if (!rawHash) return;

  const match = rawHash.match(/^slide-(\d{2})$/);
  if (!match) return;

  const targetIndex = Number.parseInt(match[1], 10) - 1;
  if (Number.isNaN(targetIndex)) return;

  slides.forEach((slide) => {
    slide.classList.remove("is-active", "exit-left", "exit-right");
    slide.style.transform = "";
    setFragmentsVisible(slide, true);
  });

  current = Math.max(0, Math.min(targetIndex, slides.length - 1));
  slides[current].classList.add("is-active");
  resetSlideScroll(slides[current]);
  updateNav();
}

function handleTouchStart(event) {
  const touch = event.changedTouches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
}

function handleTouchEnd(event) {
  const touch = event.changedTouches[0];
  const deltaX = touchStartX - touch.clientX;
  const deltaY = touchStartY - touch.clientY;

  if (Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY)) return;
  if (deltaX > 0) next();
  else prev();
}

function formatTimer(seconds) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function renderPracticeTimer(seconds) {
  practiceTimerRemaining = Math.max(0, seconds);

  practiceTimerDisplays.forEach((display) => {
    display.textContent = formatTimer(practiceTimerRemaining);
  });
}

function setPracticeTimerButton(running) {
  if (!practiceTimerToggle) return;

  practiceTimerToggle.classList.toggle("start", !running);
  practiceTimerToggle.classList.toggle("stop", running);
  practiceTimerToggle.dataset.timerState = running ? "running" : "idle";

  const strong = practiceTimerToggle.querySelector("strong");
  if (strong) strong.textContent = running ? "Stop" : "Start";
}

function stopPracticeTimer(finalSeconds = null) {
  if (practiceTimerId) {
    window.clearInterval(practiceTimerId);
    practiceTimerId = null;
  }

  practiceTimerRunning = false;
  setPracticeTimerButton(false);

  if (finalSeconds !== null) {
    renderPracticeTimer(finalSeconds);
  }
}

function startPracticeTimer() {
  if (practiceTimerRemaining <= 0) {
    renderPracticeTimer(practiceTimerDuration);
  }

  practiceTimerStartedAt = Date.now();
  const baseRemaining = practiceTimerRemaining;
  practiceTimerRunning = true;
  setPracticeTimerButton(true);

  practiceTimerId = window.setInterval(() => {
    const elapsedSeconds = Math.floor((Date.now() - practiceTimerStartedAt) / 1000);
    const remainingSeconds = Math.max(0, baseRemaining - elapsedSeconds);
    renderPracticeTimer(remainingSeconds);

    if (remainingSeconds <= 0) {
      stopPracticeTimer(0);
    }
  }, 250);
}

function togglePracticeTimer() {
  if (practiceTimerRunning) {
    stopPracticeTimer();
    return;
  }

  startPracticeTimer();
}

function copyTextFallback(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "-9999px";
  textarea.style.width = "1px";
  textarea.style.height = "1px";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);
  try {
    textarea.focus({ preventScroll: true });
  } catch (error) {
    textarea.focus();
  }
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);
  return copied ? Promise.resolve() : Promise.reject(new Error("copy command failed"));
}

function getTemplateText(templateElement) {
  if (!templateElement) return "";

  const source = templateElement.content || templateElement;
  return (source.textContent || "").trim();
}

async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch (error) {
    // file:// and some browsers expose clipboard but reject writes; use textarea fallback.
  }

  await copyTextFallback(text);
}

async function copyNotionSkillPrompt() {
  if (!copyNotionSkillPromptButton || !notionSkillInstallPrompt) return;

  const prompt = getTemplateText(notionSkillInstallPrompt);
  const label = copyNotionSkillPromptButton.querySelector("span");
  const strong = copyNotionSkillPromptButton.querySelector("strong");

  try {
    if (!prompt) {
      throw new Error("prompt is empty");
    }

    await copyText(prompt);
    copyNotionSkillPromptButton.classList.add("copied");
    if (label) label.textContent = "복사 완료";
    if (strong) strong.textContent = "Copied";
  } catch (error) {
    if (label) label.textContent = "복사 실패";
    if (strong) strong.textContent = "Select Prompt";
    window.prompt("아래 프롬프트를 복사해주세요.", prompt);
  }

  window.setTimeout(() => {
    copyNotionSkillPromptButton.classList.remove("copied");
    if (label) label.textContent = "Prompt 복사";
    if (strong) strong.textContent = "Copy Prompt";
  }, 1600);
}

syncSlideMeta();
createDots();
renderPracticeTimer(practiceTimerRemaining);
practiceTimerToggle?.addEventListener("click", togglePracticeTimer);
copyNotionSkillPromptButton?.addEventListener("click", copyNotionSkillPrompt);
window.addEventListener("keydown", handleKeydown);
window.addEventListener("touchstart", handleTouchStart, { passive: true });
window.addEventListener("touchend", handleTouchEnd, { passive: true });

slides.forEach((slide, index) => {
  if (index !== current) {
    slide.classList.remove("is-active");
  } else {
    slide.classList.add("is-active");
  }
  setFragmentsVisible(slide, true);
});

handleHash();
updateNav();
