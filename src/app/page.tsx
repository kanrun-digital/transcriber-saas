"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Mic,
  FileText,
  MessageSquare,
  Globe,
  Cloud,
  Shield,
  Upload,
  Settings,
  Zap,
  Check,
  ArrowRight,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function smoothScroll(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

/* ------------------------------------------------------------------ */
/*  Navbar                                                             */
/* ------------------------------------------------------------------ */

function Navbar() {
  const [open, setOpen] = useState(false);

  const links = [
    { label: "Можливості", href: "#features" },
    { label: "Як це працює", href: "#how" },
    { label: "Ціни", href: "#pricing" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <button
          onClick={() => smoothScroll("hero")}
          className="flex items-center gap-2 text-lg font-bold tracking-tight text-white"
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
            <Mic className="h-4 w-4 text-white" />
          </span>
          Chatterbox&nbsp;<span className="text-blue-400">AI</span>
        </button>

        {/* Desktop links */}
        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <button
              key={l.href}
              onClick={() => smoothScroll(l.href.replace("#", ""))}
              className="text-sm text-gray-400 transition hover:text-white"
            >
              {l.label}
            </button>
          ))}
          <Link
            href="/signup"
            className="rounded-full bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            Почати
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(!open)}
          className="flex flex-col gap-1.5 md:hidden"
          aria-label="Меню"
        >
          <span
            className={`block h-0.5 w-6 bg-white transition ${open ? "translate-y-2 rotate-45" : ""}`}
          />
          <span
            className={`block h-0.5 w-6 bg-white transition ${open ? "opacity-0" : ""}`}
          />
          <span
            className={`block h-0.5 w-6 bg-white transition ${open ? "-translate-y-2 -rotate-45" : ""}`}
          />
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-white/5 bg-[#0a0a0f]/95 px-6 pb-6 pt-4 md:hidden">
          {links.map((l) => (
            <button
              key={l.href}
              onClick={() => {
                smoothScroll(l.href.replace("#", ""));
                setOpen(false);
              }}
              className="block w-full py-3 text-left text-gray-300 transition hover:text-white"
            >
              {l.label}
            </button>
          ))}
          <Link
            href="/signup"
            className="mt-2 block rounded-full bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-2.5 text-center text-sm font-medium text-white"
          >
            Почати
          </Link>
        </div>
      )}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/*  Hero                                                               */
/* ------------------------------------------------------------------ */

function Hero() {
  return (
    <section
      id="hero"
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 pt-24"
    >
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="absolute right-1/4 top-1/2 h-[400px] w-[400px] rounded-full bg-purple-600/15 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl text-center">
        {/* Badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-gray-300 backdrop-blur">
          <Zap className="h-3.5 w-3.5 text-yellow-400" />
          Новий реліз — 23 професійних пресети
        </div>

        <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
          Транскрибуйте.{" "}
          <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Аналізуйте.
          </span>{" "}
          Дійте.
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-400 md:text-xl">
          AI-платформа для транскрипції аудіо та відео з&nbsp;23 професійними
          пресетами, RAG-чатом та мультимовною підтримкою.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/signup"
            className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:shadow-blue-500/40"
          >
            Спробувати безкоштовно
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </Link>
          <button
            onClick={() => smoothScroll("demo")}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-8 py-3.5 text-base font-semibold text-white backdrop-blur transition hover:bg-white/10"
          >
            Демо
          </button>
        </div>

        {/* Social proof */}
        <p className="mt-14 text-sm text-gray-500">
          Понад 2 000 користувачів вже транскрибують розумніше
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Features                                                           */
/* ------------------------------------------------------------------ */

const features = [
  {
    icon: Mic,
    title: "Транскрипція",
    desc: "Salad AI з підтримкою 100+ мов. Full та Lite режими для будь-яких потреб — від коротких нотаток до довгих інтерв'ю.",
    gradient: "from-blue-500 to-cyan-400",
  },
  {
    icon: FileText,
    title: "23 пресети",
    desc: "Podcast, YouTube SEO, Medical SOAP, Legal Brief, CRM Call Summary, HR Interview — готові формати для вашої індустрії.",
    gradient: "from-purple-500 to-pink-400",
  },
  {
    icon: MessageSquare,
    title: "AI Чат",
    desc: "Розмовляйте з вашими транскрипціями через RAG. Задавайте питання, шукайте інсайти, генеруйте саммарі.",
    gradient: "from-green-400 to-emerald-500",
  },
  {
    icon: Globe,
    title: "Мультимовність",
    desc: "Переклад на 7+ мов в один клік. Автоматична генерація SRT субтитрів для відео контенту.",
    gradient: "from-orange-400 to-amber-500",
  },
  {
    icon: Cloud,
    title: "Cloud Import",
    desc: "Імпортуйте файли з Google Drive, Dropbox або вставте пряме посилання. Без зайвих кроків.",
    gradient: "from-sky-400 to-blue-500",
  },
  {
    icon: Shield,
    title: "Приватність",
    desc: "Ваші дані — ваші. PII/PHI маскування, шифрування at-rest та in-transit. Повний контроль.",
    gradient: "from-rose-400 to-red-500",
  },
];

function Features() {
  return (
    <section id="features" className="relative px-6 py-32">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Все, що потрібно для{" "}
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              розумної транскрипції
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-gray-400">
            Від запису до аналітики — єдина платформа замість десятка
            інструментів.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group relative rounded-2xl border border-white/5 bg-white/[0.03] p-8 backdrop-blur transition hover:border-white/10 hover:bg-white/[0.06]"
            >
              {/* Icon */}
              <div
                className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${f.gradient} shadow-lg`}
              >
                <f.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed text-gray-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  How It Works                                                       */
/* ------------------------------------------------------------------ */

const steps = [
  {
    num: "01",
    icon: Upload,
    title: "Завантажте",
    desc: "Перетягніть аудіо чи відео файл, вставте посилання або імпортуйте з хмарного сховища.",
  },
  {
    num: "02",
    icon: Settings,
    title: "Налаштуйте",
    desc: "Оберіть мову, пресет та додаткові опції — переклад, субтитри, маскування даних.",
  },
  {
    num: "03",
    icon: Zap,
    title: "Отримайте результат",
    desc: "Транскрипція, аналітика та AI-чат готові за лічені хвилини. Експортуйте в будь-якому форматі.",
  },
];

function HowItWorks() {
  return (
    <section id="how" className="relative px-6 py-32">
      {/* Subtle divider glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />

      <div className="mx-auto max-w-5xl">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Як це працює
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-gray-400">
            Три простих кроки від файлу до готового результату.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.num} className="relative text-center">
              {/* Connector line (desktop) */}
              {i < steps.length - 1 && (
                <div className="pointer-events-none absolute right-0 top-12 hidden h-px w-full translate-x-1/2 bg-gradient-to-r from-blue-500/40 to-purple-500/40 md:block" />
              )}

              <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
                {/* Ring */}
                <div className="absolute inset-0 rounded-full border border-white/10" />
                <div className="absolute inset-1 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10" />
                <s.icon className="relative h-8 w-8 text-blue-400" />
              </div>

              <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-blue-400">
                Крок {s.num}
              </span>
              <h3 className="mb-2 text-xl font-semibold text-white">
                {s.title}
              </h3>
              <p className="text-sm leading-relaxed text-gray-400">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Pricing                                                            */
/* ------------------------------------------------------------------ */

interface Plan {
  name: string;
  price: string;
  period: string;
  desc: string;
  features: string[];
  cta: string;
  href: string;
  highlighted: boolean;
}

const plans: Plan[] = [
  {
    name: "Free",
    price: "0",
    period: "назавжди",
    desc: "Для знайомства з платформою",
    features: [
      "60 хвилин / місяць",
      "5 транскрипцій",
      "Базові пресети",
      "Експорт у TXT та PDF",
    ],
    cta: "Почати безкоштовно",
    href: "/signup",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "29",
    period: "/міс",
    desc: "Для професіоналів та команд",
    features: [
      "500 хвилин / місяць",
      "Всі 23 пресети",
      "RAG AI-чат",
      "Cloud Import",
      "SRT субтитри",
      "Переклад на 7+ мов",
      "Пріоритетна обробка",
    ],
    cta: "Обрати Pro",
    href: "/signup?plan=pro",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    desc: "Для великих організацій",
    features: [
      "Необмежені хвилини",
      "API доступ",
      "Пріоритетна підтримка",
      "SLA гарантія",
      "SSO / SAML",
      "Виділений менеджер",
      "Кастомні пресети",
    ],
    cta: "Зв'язатися",
    href: "/contact",
    highlighted: false,
  },
];

function Pricing() {
  return (
    <section id="pricing" className="relative px-6 py-32">
      <div className="pointer-events-none absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />

      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Прозорі ціни
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-gray-400">
            Почніть безкоштовно. Масштабуйте, коли будете готові.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative flex flex-col rounded-2xl border p-8 backdrop-blur transition ${
                p.highlighted
                  ? "border-blue-500/30 bg-gradient-to-b from-blue-500/[0.08] to-purple-500/[0.04] shadow-xl shadow-blue-500/10"
                  : "border-white/5 bg-white/[0.03] hover:border-white/10"
              }`}
            >
              {p.highlighted && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-1 text-xs font-semibold text-white">
                  Популярний
                </div>
              )}

              <h3 className="text-lg font-semibold text-white">{p.name}</h3>
              <p className="mt-1 text-sm text-gray-400">{p.desc}</p>

              <div className="mt-6 flex items-baseline gap-1">
                {p.price !== "Custom" ? (
                  <>
                    <span className="text-4xl font-extrabold text-white">
                      ${p.price}
                    </span>
                    <span className="text-gray-400">{p.period}</span>
                  </>
                ) : (
                  <span className="text-4xl font-extrabold text-white">
                    Custom
                  </span>
                )}
              </div>

              <ul className="mt-8 flex-1 space-y-3">
                {p.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-3 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
                    <span className="text-gray-300">{feat}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={p.href}
                className={`mt-8 block rounded-full py-3 text-center text-sm font-semibold transition ${
                  p.highlighted
                    ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
                    : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Demo placeholder                                                   */
/* ------------------------------------------------------------------ */

function Demo() {
  return (
    <section id="demo" className="relative px-6 py-32">
      <div className="pointer-events-none absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />

      <div className="mx-auto max-w-4xl text-center">
        <h2 className="text-3xl font-bold text-white sm:text-4xl">
          Побачте в дії
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-gray-400">
          Завантажте будь-який аудіо або відео файл і отримайте результат за
          хвилини.
        </p>

        {/* Placeholder demo area */}
        <div className="mx-auto mt-12 flex h-80 max-w-3xl items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02]">
          <div className="text-center">
            <Upload className="mx-auto mb-4 h-12 w-12 text-gray-600" />
            <p className="text-gray-500">
              Перетягніть файл сюди або{" "}
              <button className="text-blue-400 underline underline-offset-4 transition hover:text-blue-300">
                оберіть з комп&apos;ютера
              </button>
            </p>
            <p className="mt-2 text-xs text-gray-600">
              MP3, MP4, WAV, M4A — до 2 ГБ
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Footer                                                             */
/* ------------------------------------------------------------------ */

function Footer() {
  const columns = [
    {
      title: "Продукт",
      links: [
        { label: "Можливості", href: "#features" },
        { label: "Ціни", href: "#pricing" },
        { label: "API", href: "/api" },
        { label: "Документація", href: "/docs" },
      ],
    },
    {
      title: "Компанія",
      links: [
        { label: "Про нас", href: "/about" },
        { label: "Блог", href: "/blog" },
        { label: "Кар'єра", href: "/careers" },
        { label: "Контакти", href: "/contact" },
      ],
    },
    {
      title: "Правове",
      links: [
        { label: "Умови використання", href: "/terms" },
        { label: "Приватність", href: "/privacy" },
        { label: "GDPR", href: "/gdpr" },
      ],
    },
  ];

  return (
    <footer className="border-t border-white/5 px-6 pb-8 pt-16">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 md:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 text-lg font-bold text-white">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                <Mic className="h-4 w-4 text-white" />
              </span>
              Chatterbox AI
            </div>
            <p className="mt-4 text-sm leading-relaxed text-gray-500">
              AI-платформа для транскрипції та аналізу аудіо і відео контенту.
            </p>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
                {col.title}
              </h4>
              <ul className="space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-gray-500 transition hover:text-white"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 md:flex-row">
          <p className="text-xs text-gray-600">
            © 2026 Chatterbox AI. Всі права захищені.
          </p>
          <div className="flex gap-6">
            <Link
              href="https://twitter.com"
              className="text-gray-600 transition hover:text-white"
              aria-label="Twitter"
            >
              𝕏
            </Link>
            <Link
              href="https://linkedin.com"
              className="text-gray-600 transition hover:text-white"
              aria-label="LinkedIn"
            >
              in
            </Link>
            <Link
              href="https://github.com"
              className="text-gray-600 transition hover:text-white"
              aria-label="GitHub"
            >
              GH
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white antialiased selection:bg-blue-500/30">
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <Demo />
      <Pricing />
      <Footer />
    </main>
  );
}
