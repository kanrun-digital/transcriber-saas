"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  Upload,
  Settings2,
  Sparkles,
  Zap,
  Globe,
  MessageSquare,
  Youtube,
  Cloud,
  FolderOpen,
  Shield,
  ArrowRight,
  Check,
  Send,
  User,
  Bot,
  Menu,
  X,
  ChevronRight,
  Mic,
  FileText,
  BookOpen,
} from "lucide-react";

/* ───────────────────────────── NAVBAR ───────────────────────────── */

const navLinks = [
  { label: "Можливості", href: "#features" },
  { label: "Як працює", href: "#how-it-works" },
  { label: "Тарифи", href: "#pricing" },
  { label: "Контакт", href: "#contact" },
];

function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggle = useCallback(() => {
    setMobileOpen((prev) => !prev);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/70 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 text-white font-bold text-lg">
            <span className="text-2xl">🎙️</span>
            <span>Chatterbox AI</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-white/60 hover:text-white transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-white/70 hover:text-white transition-colors px-4 py-2"
            >
              Увійти
            </Link>
            <Link
              href="/signup"
              className="text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-90 transition-opacity rounded-lg px-5 py-2"
            >
              Спробувати
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={toggle}
            className="md:hidden text-white/70 hover:text-white p-2"
            aria-label="Відкрити меню"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-[#0a0a0f]/95 backdrop-blur-xl border-t border-white/[0.06] px-4 pb-6 pt-2">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={toggle}
              className="block py-3 text-white/60 hover:text-white transition-colors"
            >
              {link.label}
            </a>
          ))}
          <div className="flex flex-col gap-3 mt-4">
            <Link
              href="/login"
              className="text-center text-white/70 hover:text-white border border-white/[0.1] rounded-lg py-2.5"
            >
              Увійти
            </Link>
            <Link
              href="/signup"
              className="text-center text-white font-medium bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg py-2.5"
            >
              Спробувати
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

/* ───────────────────────────── HERO ───────────────────────────── */

function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-16">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-[#0a0a0f]">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[120px] animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left content */}
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.1] text-sm text-blue-400 mb-8">
              <Sparkles className="w-4 h-4" />
              AI-powered транскрипція нового покоління
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Транскрибуйте.{" "}
              <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Аналізуйте.
              </span>{" "}
              Дійте.
            </h1>

            <p className="text-lg text-white/60 leading-relaxed mb-8">
              23 AI-пресети для будь-якої задачі. RAG-чат по вашим транскрипціям.
              YouTube import, 100+ мов, субтитри та переклади — все в одному місці.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-90 transition-opacity text-white font-medium rounded-xl px-8 py-3.5 shadow-lg shadow-blue-500/25"
              >
                Почати безкоштовно
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 border border-white/[0.15] text-white/80 hover:text-white hover:border-white/[0.3] transition-all rounded-xl px-8 py-3.5"
              >
                Як це працює
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-white/40">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-blue-400" />
                <span>Безкоштовний план</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-blue-400" />
                <span>Без кредитної картки</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-400" />
                <span className="text-white/60 font-medium">500+ транскрипцій оброблено</span>
              </div>
            </div>
          </div>

          {/* Right — Dashboard mockup (CSS-only) */}
          <div className="relative hidden lg:block">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/5 blur-3xl rounded-full -z-10" />
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl overflow-hidden shadow-2xl">
              {/* Window bar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
                <div className="w-3 h-3 rounded-full bg-red-400/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
                <div className="w-3 h-3 rounded-full bg-green-400/80" />
                <span className="ml-3 text-xs text-white/30 font-medium">Chatterbox AI — Dashboard</span>
              </div>

              <div className="p-6">
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[
                    { label: "Транскрипції", value: "1,248", color: "text-blue-400" },
                    { label: "Точність", value: "98.5%", color: "text-purple-400" },
                    { label: "Мови", value: "100+", color: "text-blue-400" },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="text-center p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                    >
                      <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                      <p className="text-xs text-white/30 mt-1">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Chart bars */}
                <div className="h-28 bg-white/[0.02] rounded-xl flex items-end justify-around px-4 pb-3 border border-white/[0.04]">
                  {[35, 55, 40, 70, 50, 85, 60, 75, 45].map((h, i) => (
                    <div
                      key={i}
                      className="w-4 bg-gradient-to-t from-blue-500 to-purple-500 rounded-t-md"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>

                {/* Feature pills */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {[
                    { icon: Youtube, label: "YouTube" },
                    { icon: MessageSquare, label: "RAG Chat" },
                    { icon: FileText, label: "23 Пресети" },
                  ].map((pill) => (
                    <span
                      key={pill.label}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium"
                    >
                      <pill.icon className="w-3 h-3" />
                      {pill.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── FEATURES ───────────────────────────── */

const features = [
  {
    icon: Mic,
    emoji: "🎙️",
    title: "AI Транскрипція",
    desc: "Salad AI з моделями Full та Lite. Підтримка 100+ мов. Обробка 30-40 секунд на хвилину аудіо.",
  },
  {
    icon: FileText,
    emoji: "📋",
    title: "23 Пресети",
    desc: "Podcast, YouTube SEO, Medical SOAP, Legal, CRM, HR scorecard та інші готові шаблони аналізу.",
  },
  {
    icon: MessageSquare,
    emoji: "💬",
    title: "RAG Чат",
    desc: "Створіть базу знань з транскрипцій та задавайте питання. AI знаходить відповіді з контекстом.",
  },
  {
    icon: Youtube,
    emoji: "🎬",
    title: "YouTube Import",
    desc: "Імпортуйте субтитри з будь-якого YouTube відео безкоштовно та миттєво.",
  },
  {
    icon: Cloud,
    emoji: "☁️",
    title: "Cloud Import",
    desc: "Google Drive, Dropbox, прямі посилання — завантажуйте аудіо з будь-якого джерела.",
  },
  {
    icon: FolderOpen,
    emoji: "📁",
    title: "Проекти",
    desc: "Організуйте транскрипції по папках. RAG-пошук по всьому проекту одразу.",
  },
  {
    icon: Globe,
    emoji: "🌍",
    title: "Мультимовність",
    desc: "Переклад на 7+ мов, SRT субтитри, LLM translation для найкращої якості.",
  },
  {
    icon: Shield,
    emoji: "🔒",
    title: "Безпека",
    desc: "PII/PHI маскування автоматично. Ваші дані залишаються вашими.",
  },
];

function FeaturesSection() {
  return (
    <section id="features" className="relative py-20 lg:py-28 bg-[#0a0a0f]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-400 text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Можливості
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Все для роботи з аудіо та текстом
          </h2>
          <p className="text-lg text-white/50">
            Від транскрипції до аналітики — повний набір інструментів для вашого контенту.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-blue-500/30 hover:bg-white/[0.05] transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-600/10 flex items-center justify-center mb-4 group-hover:from-blue-500/20 group-hover:to-purple-600/20 transition-colors text-2xl">
                {feature.emoji}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-white/40 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── HOW IT WORKS ───────────────────────────── */

const steps = [
  {
    num: "01",
    icon: Upload,
    title: "Завантажте",
    desc: "Upload файл, вставте URL, YouTube-посилання або імпортуйте з Google Drive.",
  },
  {
    num: "02",
    icon: Settings2,
    title: "Налаштуйте",
    desc: "Оберіть один з 23 пресетів або налаштуйте параметри аналізу вручну.",
  },
  {
    num: "03",
    icon: Sparkles,
    title: "Отримайте",
    desc: "AI аналіз, RAG чат, субтитри, переклади — все готово за лічені хвилини.",
  },
];

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative py-20 lg:py-28 bg-[#0d0d14]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 text-purple-400 text-sm font-medium mb-4">
            Як працює
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Три кроки до результату
          </h2>
          <p className="text-lg text-white/50">
            Від завантаження до готового аналізу — простіше, ніж здається.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((step, index) => (
            <div key={step.num} className="relative text-center group">
              {/* Connector line (between steps) */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-px bg-gradient-to-r from-blue-500/30 to-purple-500/30" />
              )}

              <div className="relative mb-6 inline-block">
                <div className="w-24 h-24 mx-auto rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center group-hover:border-blue-500/30 group-hover:bg-white/[0.05] transition-all">
                  <step.icon className="w-10 h-10 text-blue-400" />
                </div>
                <div className="absolute -top-3 -right-3 w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center font-bold text-white text-sm shadow-lg">
                  {step.num}
                </div>
              </div>

              <h3 className="text-xl font-semibold text-white mb-2">{step.title}</h3>
              <p className="text-sm text-white/40 leading-relaxed max-w-xs mx-auto">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── AI CHAT DEMO ───────────────────────────── */

function AiChatDemoSection() {
  return (
    <section className="relative py-20 lg:py-28 bg-[#0a0a0f]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left — Chat mockup */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl overflow-hidden shadow-2xl">
            {/* Window bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
              <div className="w-3 h-3 rounded-full bg-red-400/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
              <div className="w-3 h-3 rounded-full bg-green-400/80" />
              <span className="ml-2 text-xs text-white/30 font-medium">AI Chat — RAG</span>
            </div>

            <div className="p-5 space-y-4">
              {/* User message */}
              <div className="flex gap-3 justify-end">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[80%]">
                  <p className="text-sm">Які основні теми обговорювались на зустрічі з клієнтом?</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/[0.08] flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-white/50" />
                </div>
              </div>

              {/* AI response */}
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="bg-white/[0.05] border border-white/[0.06] rounded-2xl rounded-bl-sm px-4 py-2.5 max-w-[85%]">
                    <p className="text-sm text-white/80">
                      На зустрічі обговорювались 3 ключові теми: <strong className="text-white">інтеграція API</strong> (15:23–22:10),{" "}
                      <strong className="text-white">ціноутворення</strong> (22:15–31:44) та{" "}
                      <strong className="text-white">терміни запуску</strong> (32:00–40:12). Клієнт наголосив на необхідності MVP до кінця кварталу.
                    </p>
                  </div>
                  {/* Source badge */}
                  <span className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium">
                    <BookOpen className="w-3 h-3" />
                    1 джерело · meeting_2026-03-15.mp3
                  </span>
                </div>
              </div>

              {/* Follow-up user message */}
              <div className="flex gap-3 justify-end">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[80%]">
                  <p className="text-sm">Яка ціна була запропонована?</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/[0.08] flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-white/50" />
                </div>
              </div>

              {/* AI response 2 */}
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white/[0.05] border border-white/[0.06] rounded-2xl rounded-bl-sm px-4 py-2.5 max-w-[85%]">
                  <p className="text-sm text-white/80">
                    Менеджер запропонував пакет Pro за <strong className="text-white">$2,400/міс</strong> з
                    можливістю знижки 15% при річній підписці. Клієнт попросив час на обговорення з командою.
                  </p>
                </div>
              </div>

              {/* Input mockup */}
              <div className="flex gap-2 pt-4 border-t border-white/[0.06]">
                <div className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white/20">
                  Запитайте щось про транскрипцію...
                </div>
                <button
                  type="button"
                  className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl px-4 py-2.5 text-white hover:opacity-90 transition-opacity"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Right — Description */}
          <div>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 text-purple-400 text-sm font-medium mb-4">
              <MessageSquare className="w-4 h-4" />
              RAG Chat
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Запитуйте — AI знайде відповідь
            </h2>
            <p className="text-lg text-white/50 mb-8 leading-relaxed">
              Кожна транскрипція стає частиною вашої бази знань. Задавайте питання
              природною мовою — AI знаходить точні відповіді з посиланнями на джерело та таймкоди.
            </p>

            <div className="space-y-4">
              {[
                {
                  title: "Контекстні відповіді",
                  desc: "AI цитує конкретні фрагменти транскрипцій з таймкодами.",
                },
                {
                  title: "Мульти-документ пошук",
                  desc: "Шукайте відповіді одразу по всіх транскрипціях проекту.",
                },
                {
                  title: "Посилання на джерела",
                  desc: "Кожна відповідь містить посилання на оригінальний запис.",
                },
                {
                  title: "Природна мова",
                  desc: "Запитуйте як у колеги — AI розуміє контекст та наміри.",
                },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-600/10 flex items-center justify-center flex-shrink-0">
                    <Check className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-0.5">{item.title}</h4>
                    <p className="text-sm text-white/40">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── PRICING ───────────────────────────── */

const pricingPlans = [
  {
    name: "Free",
    price: "₴0",
    period: "/міс",
    desc: "Для знайомства з платформою",
    features: [
      "60 хвилин транскрипції/міс",
      "5 транскрипцій на місяць",
      "Базові пресети аналізу",
      "YouTube Import",
      "Експорт TXT, PDF",
    ],
    cta: "Почати безкоштовно",
    href: "/signup",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "₴799",
    period: "/міс",
    desc: "Для професіоналів та команд",
    badge: "Популярний",
    features: [
      "500 хвилин транскрипції/міс",
      "Необмежені транскрипції",
      "Всі 23 пресети",
      "RAG чат по транскрипціях",
      "Cloud Import (Drive, Dropbox)",
      "Проекти та організація",
      "SRT субтитри, переклади",
      "Пріоритетна обробка",
    ],
    cta: "Обрати Pro",
    href: "/signup?plan=pro",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Індивідуально",
    period: "",
    desc: "Для великих організацій",
    features: [
      "Необмежені хвилини",
      "API доступ",
      "Пріоритетна підтримка",
      "SLA гарантія",
      "Dedicated менеджер",
      "Кастомні інтеграції",
    ],
    cta: "Звʼязатися",
    href: "#contact",
    highlighted: false,
  },
];

function PricingSection() {
  return (
    <section id="pricing" className="relative py-20 lg:py-28 bg-[#0d0d14]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-400 text-sm font-medium mb-4">
            Тарифи
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Простi та прозорі тарифи
          </h2>
          <p className="text-lg text-white/50">
            Починайте безкоштовно. Масштабуйте коли будете готові.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-start">
          {pricingPlans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-6 pt-8 transition-all duration-300 ${
                plan.highlighted
                  ? "bg-white/[0.05] border-2 border-blue-500/50 shadow-xl shadow-blue-500/10 md:scale-105"
                  : "bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12]"
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-semibold rounded-full shadow-lg">
                  {plan.badge}
                </span>
              )}

              <h3 className="text-xl font-semibold text-white mb-1">{plan.name}</h3>
              <p className="text-sm text-white/40 mb-4">{plan.desc}</p>

              <div className="mb-6">
                <span className="text-4xl font-bold text-white">{plan.price}</span>
                <span className="text-white/40">{plan.period}</span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm">
                    <Check className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span className="text-white/60">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={`block text-center font-medium rounded-xl py-3 transition-all ${
                  plan.highlighted
                    ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:opacity-90 shadow-lg shadow-blue-500/25"
                    : "border border-white/[0.12] text-white/80 hover:text-white hover:border-white/[0.25]"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── CTA ───────────────────────────── */

function CtaSection() {
  return (
    <section id="contact" className="relative py-20 lg:py-28 overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-blue-700" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgMGg2MHY2MEgweiIgZmlsbD0ibm9uZSIvPjxjaXJjbGUgY3g9IjMwIiBjeT0iMzAiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IGZpbGw9InVybCgjZykiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiLz48L3N2Zz4=')] opacity-50" />

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
          Готові почати?
        </h2>
        <p className="text-lg text-white/80 mb-10 max-w-xl mx-auto">
          Приєднуйтесь до сотень користувачів, які вже використовують Chatterbox AI
          для транскрипції та аналізу аудіо.
        </p>

        <form
          onSubmit={(e: React.FormEvent<HTMLFormElement>) => e.preventDefault()}
          className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
        >
          <input
            type="email"
            placeholder="Ваш email"
            className="flex-1 px-5 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 backdrop-blur-sm"
          />
          <button
            type="submit"
            className="px-8 py-3.5 bg-white text-blue-600 font-semibold rounded-xl hover:bg-white/90 transition-colors shadow-lg"
          >
            Почати
          </button>
        </form>

        <p className="text-sm text-white/50 mt-4">
          Безкоштовно. Без кредитної картки. Скасуйте будь-коли.
        </p>
      </div>
    </section>
  );
}

/* ───────────────────────────── FOOTER ───────────────────────────── */

const footerColumns = [
  {
    title: "Продукт",
    links: [
      { label: "Можливості", href: "#features" },
      { label: "Тарифи", href: "#pricing" },
      { label: "YouTube Import", href: "#features" },
      { label: "RAG Chat", href: "#features" },
      { label: "API", href: "#contact" },
    ],
  },
  {
    title: "Компанія",
    links: [
      { label: "Про нас", href: "#" },
      { label: "Блог", href: "#" },
      { label: "Кар'єра", href: "#" },
      { label: "Контакт", href: "#contact" },
    ],
  },
  {
    title: "Правове",
    links: [
      { label: "Умови використання", href: "#" },
      { label: "Політика конфіденційності", href: "#" },
      { label: "Cookie Policy", href: "#" },
      { label: "GDPR", href: "#" },
    ],
  },
];

function Footer() {
  return (
    <footer className="bg-[#070710] border-t border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 text-white font-bold text-lg mb-4">
              <span className="text-2xl">🎙️</span>
              <span>Chatterbox AI</span>
            </Link>
            <p className="text-sm text-white/30 leading-relaxed mb-6">
              AI-платформа для транскрипції, аналізу та роботи з аудіоконтентом.
            </p>
            {/* Social links */}
            <div className="flex gap-3">
              {["X", "LI", "YT", "TG"].map((social) => (
                <a
                  key={social}
                  href="#"
                  className="w-9 h-9 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-white/40 hover:text-white hover:border-white/[0.2] transition-all text-xs font-bold"
                >
                  {social}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {footerColumns.map((column) => (
            <div key={column.title}>
              <h4 className="text-sm font-semibold text-white mb-4">{column.title}</h4>
              <ul className="space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-white/30 hover:text-white/70 transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-white/20">
            © 2026 Chatterbox AI. Усі права захищені.
          </p>
          <p className="text-sm text-white/20">
            Зроблено з 💙 в Україні
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ───────────────────────────── MAIN PAGE ───────────────────────────── */

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white antialiased scroll-smooth">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <AiChatDemoSection />
      <PricingSection />
      <CtaSection />
      <Footer />
    </main>
  );
}
