import { NextRequest, NextResponse } from "next/server";
import * as ncb from "@/lib/ncb";

/**
 * POST /api/admin/seed-presets
 * 
 * Seeds default presets into the database.
 * Admin-only. Skips presets that already exist (by title).
 */

const DEFAULT_PRESETS = [
  // MEDIA PRODUCTION
  { title: "Podcast — Show Notes + Chapters", description: "Show notes, розділи з таймкодами, цитати для подкастів", category: "media", transcription_type: "full", is_public: 1, config_json: JSON.stringify({ language_code: "uk", sentence_level_timestamps: true, word_level_timestamps: false, diarization: true, sentence_diarization: true, srt: true, summarize: 150, custom_prompt: "Створіть show notes з таймкодами, цитатами та ключовими тезами для подкасту." }) },
  { title: "YouTube — SEO пакет", description: "Метадані + таймлайни під SEO для YouTube", category: "media", transcription_type: "full", is_public: 1, config_json: JSON.stringify({ language_code: "uk", sentence_level_timestamps: true, srt: true, summarize: 120, custom_prompt: "Створіть SEO-пакет: заголовок (70 символів), опис (1500 символів), теги, розділи з таймкодами, хештеги." }) },
  { title: "Соцмережі — чисті субтитри", description: "Динамічні титри для Reels/TikTok", category: "media", transcription_type: "full", is_public: 1, config_json: JSON.stringify({ language_code: "uk", sentence_level_timestamps: true, word_level_timestamps: true, srt: true, custom_prompt: "Очистіть текст від слів-паразитів. Блоки по 2 рядки, 16-22 символи на рядок." }) },
  { title: "Broadcast — Verbatim", description: "Дослівна стенограма з точними таймкодами", category: "media", transcription_type: "full", is_public: 1, config_json: JSON.stringify({ language_code: "uk", sentence_level_timestamps: true, word_level_timestamps: true, diarization: true, custom_prompt: "Дослівна стенограма без стилістичних правок. Зберігайте паузи (...), обмовки та жаргон." }) },
  { title: "Док/репортаж — EN переклад + SRT", description: "Переклад на англійську + субтитри + локалізація", category: "media", transcription_type: "full", is_public: 1, config_json: JSON.stringify({ language_code: "uk", sentence_level_timestamps: true, diarization: true, srt: true, summarize: 120, translate: "to_eng", srt_translation: "french, german, spanish, portuguese, italian, hindi, thai" }) },

  // EDUCATION
  { title: "Лекція — Cornell Notes + картки", description: "Конспект за системою Cornell + флеш-картки", category: "education", transcription_type: "full", is_public: 1, config_json: JSON.stringify({ language_code: "uk", summarize: 200, custom_prompt: "Конспект за системою Корнелл: ключові ідеї, нотатки, резюме (200 слів). Додайте 8-12 флеш-карток Q/A та список визначень." }) },
  { title: "Семінар — протокол + завдання", description: "Протокол семінару з рішеннями та задачами", category: "education", transcription_type: "full", is_public: 1, config_json: JSON.stringify({ language_code: "uk", sentence_level_timestamps: true, diarization: true, sentence_diarization: true, summarize: 120, custom_prompt: "Протокол семінару: резюме, рішення, завдання з owner/due/priority, наступні кроки." }) },
  { title: "MOOC — субтитри + 7 мов", description: "Субтитри для онлайн-курсів + переклади", category: "education", transcription_type: "full", is_public: 1, config_json: JSON.stringify({ language_code: "uk", sentence_level_timestamps: true, srt: true, summarize: 80, llm_translation: "english, french, german, spanish, portuguese, hindi, thai", srt_translation: "english, french, german, spanish, portuguese, hindi, thai", custom_prompt: "Очистіть транскрипт для навчальних субтитрів: виправте пунктуацію, видаліть слова-паразити, збережіть терміни." }) },
  { title: "Доступність — спрощений текст (B1)", description: "Адаптація для рівня B1", category: "education", transcription_type: "full", is_public: 1, config_json: JSON.stringify({ language_code: "uk", summarize: 120, custom_prompt: "Перепишіть текст для рівня B1: короткі речення, прості слова, пояснення термінів. Не змінюйте факти та числа." }) },

  // LEGAL & MEDICAL
  { title: "Депозиція — дослівно + спікери", description: "Дослівна стенограма з ідентифікацією спікерів", category: "legal_medical", transcription_type: "full", is_public: 1, config_json: JSON.stringify({ language_code: "uk", sentence_level_timestamps: true, word_level_timestamps: true, diarization: true, sentence_diarization: true, custom_prompt: "Дослівна стенограма без стилістичних правок. Ідентифікація спікерів за діаризацією. Не інтерпретуйте висловлювання." }) },
  { title: "Засідання — порядок питань + саммарі", description: "Юридичні питання і підсумок", category: "legal_medical", transcription_type: "full", is_public: 1, config_json: JSON.stringify({ language_code: "uk", sentence_level_timestamps: true, diarization: true, summarize: 150, custom_prompt: "Резюме засідання, перелік юридичних питань, згадані НПА, прийняті рішення, відкриті питання." }) },
  { title: "Медицина — SOAP-замітка", description: "SOAP-замітка з діалогу лікар-пацієнт", category: "legal_medical", transcription_type: "full", is_public: 1, config_json: JSON.stringify({ language_code: "uk", diarization: true, sentence_diarization: true, multichannel: true, summarize: 120, custom_prompt: "SOAP-замітка: S (скарги), O (об'єктивно), A (оцінка), P (план). Окремо: алергії та поточні ліки." }) },
  { title: "Медицина — пам'ятка пацієнту", description: "Зрозумілі рекомендації лікаря", category: "legal_medical", transcription_type: "full", is_public: 1, config_json: JSON.stringify({ language_code: "uk", diarization: true, summarize: 100, custom_prompt: "Пам'ятка пацієнту: інструкція, прийом ліків, моніторинг, тривожні симптоми, повторне звернення. Проста мова. Додайте: 'Ця пам'ятка не заміняє консультацію лікаря.'" }) },

  // BUSINESS
  { title: "Зустріч — протокол, рішення, завдання", description: "Протокол з рішеннями та розподілом завдань", category: "business", transcription_type: "full", is_public: 1, config_json: JSON.stringify({ language_code: "uk", sentence_level_timestamps: true, diarization: true, sentence_diarization: true, multichannel: true, summarize: 120, custom_prompt: "JSON протокол: summary, decisions, risks, actions (owner/task/due/priority), followups. Не вигадуйте дані." }) },
  { title: "Продажі — CRM-структура", description: "Витяг даних з дзвінка для CRM", category: "business", transcription_type: "full", is_public: 1, config_json: JSON.stringify({ language_code: "uk", sentence_level_timestamps: true, diarization: true, multichannel: true, summarize: 100, custom_prompt: "JSON для CRM: company, contacts, pain_points, use_case, competitors, objections, next_step, meeting_outcome." }) },
  { title: "HR — оцінний лист інтерв'ю", description: "Scorecard для оцінки кандидата", category: "business", transcription_type: "full", is_public: 1, config_json: JSON.stringify({ language_code: "uk", diarization: true, summarize: 120, custom_prompt: "Hiring scorecard: компетенції зі свідченнями, сильні сторони, ризики, мотивація, рекомендація (hire/no_hire/talent_pool)." }) },
  { title: "Підтримка — QA чеклист", description: "Оцінка якості дзвінка підтримки", category: "business", transcription_type: "full", is_public: 1, config_json: JSON.stringify({ language_code: "uk", sentence_level_timestamps: true, diarization: true, multichannel: true, summarize: 80, custom_prompt: "QA чеклист: привітання, верифікація, уточнення проблеми, рішення/ескалація, резюме, NPS/CSAT. Для кожного кроку: done + evidence." }) },

  // CROSS-SCENARIO
  { title: "Редакція — маскуємо PII/PHI", description: "Автоматичне маскування персональних даних", category: "cross_scenario", transcription_type: "full", is_public: 1, config_json: JSON.stringify({ language_code: "uk", sentence_level_timestamps: true, diarization: true, custom_prompt: "Замініть всі ПІБ, телефони, email, адреси, номери паспортів/карток на [REDACTED]. Збережіть структуру. Додайте попередження про неповноту автоматичної редакції." }) },
  { title: "Вилучення сутностей та фактів", description: "Екстракція імен, організацій, дат", category: "cross_scenario", transcription_type: "full", is_public: 1, config_json: JSON.stringify({ language_code: "uk", sentence_level_timestamps: true, custom_prompt: "JSON з сутностями: people, organizations, locations, products, dates, amounts, links. Для кожної — value та first_mention (мм:сс)." }) },
  { title: "Теми та розділи з таймкодами", description: "Розбивка на смислові розділи", category: "cross_scenario", transcription_type: "full", is_public: 1, config_json: JSON.stringify({ language_code: "uk", sentence_level_timestamps: true, summarize: 120, custom_prompt: "6-12 смислових розділів: назва (80 символів), опис цінності (1-2 речення), стартовий таймкод (мм:сс)." }) },
  { title: "Оригінал + LLM переклади (7 мов)", description: "Оригінальний текст + переклади", category: "cross_scenario", transcription_type: "full", is_public: 1, config_json: JSON.stringify({ language_code: "uk", sentence_level_timestamps: true, srt: true, summarize: 100, llm_translation: "english, french, german, spanish, portuguese, hindi, thai", srt_translation: "english, french, german, spanish, portuguese, hindi, thai" }) },
  { title: "Чистий виклад для звітів", description: "Розмовна мова → письмовий стиль", category: "cross_scenario", transcription_type: "full", is_public: 1, config_json: JSON.stringify({ language_code: "uk", custom_prompt: "Трансформуйте розмовний транскрипт у діловий стиль: видаліть слова-паразити, виправте граматику, збережіть терміни та факти." }) },
];

export async function POST(req: NextRequest) {
  try {
    await ncb.requireAuth(req);

    // Check if admin
    const results: string[] = [];
    let created = 0;
    let skipped = 0;

    for (const preset of DEFAULT_PRESETS) {
      // Check if exists by title
      const existing = await ncb.read<any>("presets", {
        filters: { title: preset.title },
        limit: 1,
      });

      if (existing.data?.length > 0) {
        skipped++;
        results.push(`SKIP: ${preset.title}`);
        continue;
      }

      await ncb.create("presets", {
        workspace_id: 30, // admin workspace
        app_user_id: 23,  // admin user
        ...preset,
        is_active: 1,
      });
      created++;
      results.push(`OK: ${preset.title}`);
    }

    return NextResponse.json({
      ok: true,
      created,
      skipped,
      total: DEFAULT_PRESETS.length,
      results,
    });
  } catch (error: any) {
    console.error("[Seed Presets] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
