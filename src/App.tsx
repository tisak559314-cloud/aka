import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowDown,
  Fingerprint,
  ScanLine,
  ShieldCheck,
  Layers3,
  Camera,
  Check,
  Plus,
  Minus,
  Menu,
  X,
  Upload,
  RotateCcw,
  Download,
  LoaderCircle,
  MoveHorizontal,
  AlertCircle,
  Focus,
  Play,
  ScanEye,
  ChevronRight,
} from "lucide-react";

type Result = {
  decision: string;
  geometry: string;
  message: string;
  inliers: number;
  candidate_matches: number;
  reprojection_error_px: number | null;
  coverage_percent: number;
  elapsed_ms: number;
  warnings: string[];
  evidence_image: string;
  reference_image: string;
  aligned_image: string | null;
  algorithm: string;
  sha256: string[];
  limitations: string;
};
type Photo = { file: File; url: string };
const CAR = "/images/car-studio.png";

function Brand({ footer = false }: { footer?: boolean }) {
  return (
    <a
      className={`brand ${footer ? "brand-footer" : ""}`}
      href="#top"
      aria-label="CarPrint — на главную"
    >
      <span className="brand-icon">
        <Fingerprint size={30} strokeWidth={1.65} />
      </span>
      <span>
        carprint<span className="brand-dot">AI</span>
      </span>
    </a>
  );
}

function PhotoInput({
  label,
  number,
  value,
  onChange,
  disabled,
}: {
  label: string;
  number: string;
  value: Photo | null;
  onChange: (file: File | null) => void;
  disabled: boolean;
}) {
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const drop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    if (!disabled && e.dataTransfer.files[0]) onChange(e.dataTransfer.files[0]);
  };
  return (
    <div
      className={`photo-input ${drag ? "dragging" : ""} ${value ? "has-photo" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={drop}
    >
      <div className="photo-label">
        <span>
          {number} / {label}
        </span>
        {value && (
          <button
            className="icon-button"
            aria-label={`Удалить ${label.toLowerCase()}`}
            disabled={disabled}
            onClick={() => onChange(null)}
          >
            <X size={16} />
          </button>
        )}
      </div>
      <button
        className="photo-target"
        disabled={disabled}
        onClick={() => input.current?.click()}
        aria-label={`Загрузить: ${label}`}
      >
        {value ? (
          <>
            <img src={value.url} alt={label} />
            <span className="replace-photo">
              <Camera size={15} /> Заменить фотографию
            </span>
          </>
        ) : (
          <>
            <span className="upload-icon">
              <Upload size={24} strokeWidth={1.5} />
            </span>
            <strong>Добавьте фотографию</strong>
            <span>или перетащите её сюда</span>
            <small>JPG, PNG, WebP · до 8 МБ</small>
          </>
        )}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        disabled={disabled}
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          const f = e.target.files?.[0];
          if (f) onChange(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function Comparison({ result }: { result: Result }) {
  const [tab, setTab] = useState<"points" | "overlay">("points");
  const [split, setSplit] = useState(50);
  const download = () => {
    const {
      evidence_image: _e,
      reference_image: _r,
      aligned_image: _a,
      ...report
    } = result;
    const blob = new Blob(
      [
        JSON.stringify(
          { ...report, exported_at: new Date().toISOString() },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `carprint-report-${Date.now()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div className="results" aria-live="polite">
      <div className="result-heading">
        <div>
          <span className="mono small">РЕЗУЛЬТАТ СРАВНЕНИЯ</span>
          <h3>{result.message}</h3>
        </div>
        <span className="review-tag">
          <Focus size={14} /> REVIEW · проверка экспертом
        </span>
      </div>
      <div className="result-metrics">
        <div>
          <strong>{result.inliers}</strong>
          <span>устойчивых совпадений</span>
        </div>
        <div>
          <strong>
            {result.reprojection_error_px ?? "—"}
            <small> px</small>
          </strong>
          <span>медианная ошибка</span>
        </div>
        <div>
          <strong>
            {result.elapsed_ms}
            <small> мс</small>
          </strong>
          <span>обработка на сервере</span>
        </div>
      </div>
      <div className="result-toolbar">
        <div className="view-tabs">
          <button
            className={tab === "points" ? "active" : ""}
            onClick={() => setTab("points")}
          >
            Совпавшие точки
          </button>
          <button
            className={tab === "overlay" ? "active" : ""}
            disabled={!result.aligned_image}
            onClick={() => setTab("overlay")}
          >
            Совмещение
          </button>
        </div>
        <button className="text-button" onClick={download}>
          <Download size={16} /> Скачать отчёт
        </button>
      </div>
      {tab === "points" ? (
        <img
          className="evidence-image"
          src={result.evidence_image}
          alt="Реальные геометрически согласованные точки, соединённые линиями между фотографиями"
        />
      ) : (
        <div className="overlay-comparison">
          <img src={result.reference_image} alt="Исходный снимок" />
          <img
            className="aligned-image"
            src={result.aligned_image!}
            alt="Совмещённый повторный снимок"
            style={{ clipPath: `inset(0 0 0 ${split}%)` }}
          />
          <div className="compare-divider" style={{ left: `${split}%` }}>
            <MoveHorizontal size={20} />
          </div>
          <span className="before-label">Исходный</span>
          <span className="after-label">Повторный</span>
          <input
            aria-label="Положение разделителя сравнения"
            type="range"
            min="0"
            max="100"
            value={split}
            onChange={(e) => setSplit(Number(e.target.value))}
          />
        </div>
      )}
      <div className="result-notes">
        <AlertCircle size={19} />
        <div>
          <strong>Геометрия — основание для проверки, а не вердикт.</strong>
          {result.warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
          <p>Детекция повреждений в этой версии не выполняется.</p>
        </div>
      </div>
    </div>
  );
}

function Workspace() {
  const [photos, setPhotos] = useState<[Photo | null, Photo | null]>([
    null,
    null,
  ]);
  const photosRef = useRef(photos);
  photosRef.current = photos;
  const [busy, setBusy] = useState(false);
  const [loadingExample, setLoadingExample] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [isExample, setIsExample] = useState(false);
  const [guide, setGuide] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  useEffect(
    () => () => {
      photosRef.current.forEach((p) => p && URL.revokeObjectURL(p.url));
    },
    [],
  );
  const change = (index: number, file: File | null) => {
    if (
      file &&
      (!["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > 8 * 1024 * 1024)
    ) {
      setError("Выберите JPG, PNG или WebP размером до 8 МБ.");
      return;
    }
    setError("");
    setResult(null);
    setIsExample(false);
    setPhotos((old) => {
      const next: [Photo | null, Photo | null] = [...old];
      if (next[index]) URL.revokeObjectURL(next[index]!.url);
      next[index] = file ? { file, url: URL.createObjectURL(file) } : null;
      return next;
    });
  };
  const example = async () => {
    setLoadingExample(true);
    setError("");
    setResult(null);
    try {
      const files = await Promise.all(
        ["reference", "current"].map(async (name) => {
          const res = await fetch(`/api/example/${name}`);
          if (!res.ok) throw new Error();
          const b = await res.blob();
          return new File([b], `${name}-synthetic.jpg`, { type: "image/jpeg" });
        }),
      );
      photosRef.current.forEach((p) => p && URL.revokeObjectURL(p.url));
      setPhotos(
        files.map((file) => ({ file, url: URL.createObjectURL(file) })) as [
          Photo,
          Photo,
        ],
      );
      setIsExample(true);
    } catch {
      setError(
        "Не удалось загрузить пример. Проверьте подключение к серверу или добавьте свои фотографии.",
      );
    } finally {
      setLoadingExample(false);
    }
  };
  const compare = async () => {
    if (!photos[0] || !photos[1]) return;
    setBusy(true);
    setError("");
    setResult(null);
    const data = new FormData();
    data.append("reference", photos[0].file);
    data.append("current", photos[1].file);
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        body: data,
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) {
        let detail = "Не удалось обработать фотографии. Попробуйте ещё раз.";
        try {
          const body = await res.json();
          if (typeof body.detail === "string") detail = body.detail;
        } catch {
          /* Non-JSON server error. */
        }
        throw new Error(detail);
      }
      const body = await res.json();
      setResult(body);
      setTimeout(
        () =>
          resultRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          }),
        100,
      );
    } catch (e) {
      setError(
        e instanceof Error && e.name !== "TypeError"
          ? e.message
          : "Сервер сравнения недоступен. Проверьте соединение и повторите попытку.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="workspace section-pad" id="workspace">
      <div className="section-heading reveal">
        <div>
          <span className="eyebrow">
            <span className="status-dot" /> ПОПРОБУЙТЕ В ДЕЛЕ
          </span>
          <h2>
            От фотографий
            <br />к <span className="serif">доказательствам.</span>
          </h2>
        </div>
        <p>
          Два снимка одной детали.
          <br />
          Реальные совпадения. Понятный результат.
        </p>
      </div>
      <div className="lab reveal">
        <div className="lab-top">
          <span>
            <ScanLine size={20} />
            <strong>Лаборатория CarPrint</strong>
            <span className="beta-tag">BETA</span>
          </span>
          <button
            className="text-button"
            onClick={() => setGuide(!guide)}
            aria-expanded={guide}
          >
            {guide ? "Скрыть подсказки" : "Как фотографировать"}{" "}
            {guide ? <Minus size={15} /> : <Plus size={15} />}
          </button>
        </div>
        {guide && (
          <div className="capture-guide">
            <div>
              <Camera size={22} />
              <strong>Одна и та же деталь</strong>
              <p>Снимите дверь, диск или крыло крупно в обоих осмотрах.</p>
            </div>
            <div>
              <Focus size={22} />
              <strong>Похожий ракурс</strong>
              <p>Держите камеру ровно. Избегайте бликов, грязи и смаза.</p>
            </div>
            <div>
              <ShieldCheck size={22} />
              <strong>Индивидуальные следы</strong>
              <p>
                Включите в кадр сколы или потёртости. Не загружайте личные
                данные.
              </p>
            </div>
          </div>
        )}
        <div className="upload-grid">
          <PhotoInput
            label="Исходный осмотр"
            number="01"
            value={photos[0]}
            onChange={(f) => change(0, f)}
            disabled={busy || loadingExample}
          />
          <span className="upload-connector">
            <ArrowRight size={20} />
          </span>
          <PhotoInput
            label="Повторный осмотр"
            number="02"
            value={photos[1]}
            onChange={(f) => change(1, f)}
            disabled={busy || loadingExample}
          />
        </div>
        {isExample && (
          <p className="example-notice">
            <AlertCircle size={15} /> Синтетический пример: AI-изображение и его
            преобразованная копия. Демонстрирует геометрию, а не точность
            проверки реальных автомобилей.
          </p>
        )}
        {error && (
          <p className="error-message" role="alert">
            <AlertCircle size={18} />
            {error}
          </p>
        )}
        <div className="lab-actions">
          <div>
            <button
              className="text-button example-button"
              onClick={example}
              disabled={busy || loadingExample}
            >
              {loadingExample ? (
                <LoaderCircle className="spin" size={17} />
              ) : (
                <Play size={15} />
              )}{" "}
              {loadingExample ? "Загружаем…" : "Использовать пример"}
            </button>
            <span className="local-note">
              <ShieldCheck size={13} /> Без постоянного хранения фотографий
            </span>
          </div>
          <button
            className="button button-lime"
            onClick={compare}
            disabled={!photos[0] || !photos[1] || busy || loadingExample}
          >
            {busy ? (
              <>
                <LoaderCircle className="spin" size={19} /> Сопоставляем детали…
              </>
            ) : (
              <>
                Сравнить снимки <ArrowUpRight size={20} />
              </>
            )}
          </button>
        </div>
        <div ref={resultRef} className="result-anchor">
          {result && <Comparison result={result} />}
        </div>
      </div>
      <div className="lab-footnote">
        <span className="mono">SIFT + RANSAC</span>
        <span>
          Прототип геометрического сопоставления · решение остаётся за
          специалистом
        </span>
        <span className="mono">VERSION 0.1</span>
      </div>
    </section>
  );
}

const faqs = [
  [
    "Это точно тот же автомобиль?",
    "Совпадения на фотографиях дают визуальные основания для проверки. Серийные детали разных машин могут совпадать. Для подтверждения нужны индивидуальные следы, несколько независимых зон и при необходимости VIN. Текущий прототип возвращает REVIEW — проверка специалистом.",
  ],
  [
    "Что уже работает в прототипе?",
    "Загрузка произвольных снимков JPG, PNG и WebP, поиск признаков SIFT, геометрический контроль RANSAC, визуализация совпадений, совмещение фотографий и экспорт отчёта. История осмотров, распознавание повреждений и обученные AI-модели — следующие этапы продукта.",
  ],
  [
    "Можно снимать обычным телефоном?",
    "Да. Лучше снимать одну и ту же деталь крупно, с похожего ракурса и при рассеянном свете. Фотографии принимаются прямо из галереи телефона. Блики, сильный смаз и грязь мешают сопоставлению — приложение сообщит о недостатке доказательств.",
  ],
  [
    "Где обрабатываются и хранятся фотографии?",
    "Изображения передаются на сервер этого приложения и обрабатываются с помощью OpenCV. После ответа сервера временные загрузки удаляются: постоянного хранилища и базы клиентов нет. После обновления страницы снимки и результат исчезают; отчёт можно скачать до закрытия страницы.",
  ],
];

export default function App() {
  const [menu, setMenu] = useState(false);
  const [intro, setIntro] = useState(
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [activePoint, setActivePoint] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  useEffect(() => {
    const timer = setTimeout(() => setIntro(false), 1400);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            observer.unobserve(e.target);
          }
        }),
      { threshold: 0.08 },
    );
    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!menu) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(false);
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [menu]);
  const steps = [
    {
      icon: Camera,
      title: "Зафиксируйте состояние",
      text: "Снимите автомобиль и индивидуальные следы на деталях. Хороший исходный кадр — начало доказательной истории.",
      label: "01 / CAPTURE",
      heading: "Всё начинается\nс одного снимка.",
      tag: "Смартфон. Свет. Нужный ракурс.",
    },
    {
      icon: ScanEye,
      title: "Сопоставьте детали",
      text: "Загрузите повторный снимок. Алгоритм найдёт локальные признаки и проверит их геометрическое соответствие.",
      label: "02 / COMPARE",
      heading: "Знакомая деталь.\nНовый взгляд.",
      tag: "Локальные признаки + геометрия",
    },
    {
      icon: ShieldCheck,
      title: "Изучите доказательства",
      text: "Посмотрите совпавшие точки и совмещённые снимки. Сохраните отчёт и передайте результат специалисту.",
      label: "03 / REVIEW",
      heading: "Каждый вывод\nможно проверить.",
      tag: "Визуальные основания для решения",
    },
  ];
  return (
    <>
      <a href="#main" className="skip-link">
        Перейти к содержимому
      </a>
      {intro && (
        <div className="intro" aria-hidden="true">
          <Fingerprint size={76} strokeWidth={1} />
          <span>CARPRINT</span>
          <div className="intro-track">
            <i />
          </div>
          <small>EVERY DETAIL TELLS A STORY</small>
        </div>
      )}
      <header className="header">
        <div className="header-inner">
          <Brand />
          <nav
            className={menu ? "nav open" : "nav"}
            aria-label="Основная навигация"
          >
            <a href="#how-it-works" onClick={() => setMenu(false)}>
              Как это работает
            </a>
            <a href="#technology" onClick={() => setMenu(false)}>
              Технология
            </a>
            <a href="#solutions" onClick={() => setMenu(false)}>
              Для бизнеса
            </a>
            <a
              className="mobile-cta"
              href="#workspace"
              onClick={() => setMenu(false)}
            >
              Начать проверку <ArrowUpRight size={17} />
            </a>
          </nav>
          <div className="header-actions">
            <span className="language">
              RU <span>/</span> <span className="mono">01</span>
            </span>
            <a className="button button-outline header-cta" href="#workspace">
              Начать проверку <ArrowUpRight size={17} />
            </a>
            <button
              className="menu-button"
              aria-label={menu ? "Закрыть меню" : "Открыть меню"}
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      <main id="main">
        <section className="hero" id="top">
          <div className="hero-grid" />
          <div className="hero-orbit" />
          <div className="hero-image">
            <img
              src={CAR}
              alt="Серебристый автомобиль в тёмной студии, подготовленный к визуальному осмотру"
              fetchPriority="high"
            />
            <div className="scan-beam" />
          </div>
          <div className="hero-content">
            <span className="eyebrow hero-eyebrow">
              <span className="status-dot" /> VEHICLE VERIFICATION INTELLIGENCE
            </span>
            <h1>
              У каждой машины
              <br />
              есть свой
              <br />
              <span className="hero-accent">
                отпечаток<span className="period">.</span>
              </span>
            </h1>
            <p>
              Узнайте автомобиль по деталям.
              <br />
              Сравните состояние. Сохраните доказательства.
            </p>
            <div className="hero-buttons">
              <a className="button button-lime" href="#workspace">
                Проверить автомобиль <ArrowUpRight size={20} />
              </a>
              <a className="button hero-secondary" href="#how-it-works">
                <span className="play-circle">
                  <Play size={12} fill="currentColor" />
                </span>{" "}
                Как это работает
              </a>
            </div>
            <div className="hero-note">
              <ShieldCheck size={15} />
              <span>Каждая деталь имеет значение.</span>
            </div>
          </div>
          <div className="scan-status">
            <span className="status-dot" />
            <span className="mono">CARPRINT VISION</span>
            <ScanLine size={17} />
          </div>
          <div
            className={`car-point point-one ${activePoint === 0 ? "selected" : ""}`}
          >
            <button
              onClick={() => setActivePoint(activePoint === 0 ? -1 : 0)}
              aria-label="Показать область осмотра диска"
              aria-expanded={activePoint === 0}
            >
              <Plus size={15} />
            </button>
            {activePoint === 0 && (
              <div className="point-label">
                <span className="mono">01 / ОБЛАСТЬ ОСМОТРА</span>
                <strong>Индивидуальные следы</strong>
                <small>Диск · кромки · поверхность</small>
              </div>
            )}
          </div>
          <div
            className={`car-point point-two ${activePoint === 1 ? "selected" : ""}`}
          >
            <button
              onClick={() => setActivePoint(activePoint === 1 ? -1 : 1)}
              aria-label="Показать область осмотра двери"
              aria-expanded={activePoint === 1}
            >
              <Plus size={15} />
            </button>
            {activePoint === 1 && (
              <div className="point-label">
                <span className="mono">02 / ОБЛАСТЬ ОСМОТРА</span>
                <strong>История поверхности</strong>
                <small>Дверь · сколы · потёртости</small>
              </div>
            )}
          </div>
          <div className="hero-bottom">
            <a href="#technology" className="scroll-cue">
              <span>
                <ArrowDown size={16} />
              </span>{" "}
              Откройте больше
            </a>
            <span className="hero-image-note">
              AI-визуализация · концепция осмотра
            </span>
            <span className="mono hero-coordinate">
              41°18′ N &nbsp; 69°16′ E
            </span>
          </div>
        </section>
        <div className="value-strip">
          <div>
            <Fingerprint size={23} />
            <span>
              Идентичность <strong>в деталях</strong>
            </span>
          </div>
          <div>
            <Layers3 size={23} />
            <span>
              Состояние <strong>во времени</strong>
            </span>
          </div>
          <div>
            <ShieldCheck size={23} />
            <span>
              Решения <strong>на основе доказательств</strong>
            </span>
          </div>
          <span className="strip-end mono">
            BUILT TO SEE MORE <ArrowUpRight size={16} />
          </span>
        </div>

        <section className="technology section-pad" id="technology">
          <div className="section-heading reveal">
            <div>
              <span className="eyebrow dark-eyebrow">
                <span className="tiny-cross">+</span> БОЛЬШЕ, ЧЕМ ФОТОГРАФИЯ
              </span>
              <h2>
                Знакомая модель.
                <br />
                <span className="serif">Уникальная история.</span>
              </h2>
            </div>
            <p>
              Тысячи машин выглядят одинаково.
              <br />
              Индивидуальные следы рассказывают,
              <br />
              что происходило именно с этой.
            </p>
          </div>
          <div className="feature-grid">
            <article className="feature-card feature-identity reveal">
              <div className="card-top">
                <span className="mono">01 / IDENTITY</span>
                <Fingerprint size={24} />
              </div>
              <div className="fingerprint-art">
                <Fingerprint strokeWidth={0.65} />
                <div className="fingerprint-cross cross-a" />
                <div className="fingerprint-cross cross-b" />
                <span className="fingerprint-line" />
                <span className="art-caption mono">UNIQUE BY NATURE</span>
              </div>
              <div className="card-copy">
                <h3>Та же машина?</h3>
                <p>
                  Сопоставляйте индивидуальные признаки.
                  <br />
                  Проверяйте то, что делает машину уникальной.
                </p>
              </div>
            </article>
            <article className="feature-card feature-history reveal">
              <div className="card-top">
                <span className="mono">02 / CONDITION</span>
                <Layers3 size={23} />
              </div>
              <div className="history-art">
                <img src={CAR} alt="Детали кузова автомобиля" loading="lazy" />
                <div className="history-frame">
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                <div className="history-pill">
                  <span className="status-dot" /> В фокусе — каждая деталь
                </div>
              </div>
              <div className="card-copy">
                <h3>Что изменилось?</h3>
                <p>
                  Сравнивайте осмотры и замечайте изменения.
                  <br />
                  История начинается с исходного снимка.
                </p>
              </div>
            </article>
            <article className="feature-card feature-evidence reveal">
              <div className="card-top">
                <span className="mono">03 / EVIDENCE</span>
                <ShieldCheck size={23} />
              </div>
              <div className="evidence-art">
                <div className="mini-report">
                  <div>
                    <span className="mini-logo">
                      <Fingerprint size={16} /> carprint
                    </span>
                    <span className="mono">REPORT</span>
                  </div>
                  <span className="report-line long" />
                  <span className="report-line" />
                  <div className="report-check">
                    <Check size={15} />
                    <span>Визуальные совпадения</span>
                  </div>
                  <div className="report-check">
                    <Check size={15} />
                    <span>Геометрическое совмещение</span>
                  </div>
                  <div className="report-check">
                    <Check size={15} />
                    <span>Проверяемый результат</span>
                  </div>
                  <div className="report-bottom">
                    <span className="mono">EXPERT REVIEW</span>
                    <ShieldCheck size={20} />
                  </div>
                </div>
              </div>
              <div className="card-copy">
                <h3>На чём основан вывод?</h3>
                <p>
                  Изучайте визуальные доказательства.
                  <br />
                  Решение принимает человек.
                </p>
              </div>
            </article>
          </div>
          <div className="technology-note">
            <span className="mono">THE CARPRINT APPROACH</span>
            <p>
              Геометрия + индивидуальные признаки + качество снимка + экспертная
              проверка.
            </p>
          </div>
        </section>

        <section className="how section-pad" id="how-it-works">
          <div className="section-heading reveal">
            <div>
              <span className="eyebrow">
                <span className="tiny-cross">+</span> ПРОСТОЙ ПРОЦЕСС.
                ПРОВЕРЯЕМЫЙ РЕЗУЛЬТАТ.
              </span>
              <h2>
                Три шага.
                <br />
                <span className="serif">Полная картина.</span>
              </h2>
            </div>
            <a className="text-link" href="#workspace">
              Попробовать сейчас <ArrowUpRight size={21} />
            </a>
          </div>
          <div className="how-grid reveal">
            <div className="steps">
              {steps.map((s, i) => (
                <button
                  key={s.title}
                  className={`step ${activeStep === i ? "active" : ""}`}
                  onClick={() => setActiveStep(i)}
                  aria-expanded={activeStep === i}
                >
                  <span className="step-number mono">0{i + 1}</span>
                  <div>
                    <h3>{s.title}</h3>
                    {activeStep === i && <p>{s.text}</p>}
                  </div>
                  <ArrowUpRight size={20} />
                </button>
              ))}
            </div>
            <div className={`process-visual process-${activeStep}`}>
              <img src={CAR} alt="Автомобиль для фотоосмотра" loading="lazy" />
              <div className="process-shade" />
              <span className="process-label mono">
                {steps[activeStep].label}
              </span>
              <h3 key={activeStep}>{steps[activeStep].heading}</h3>
              <div className="focus-corners">
                <i />
                <i />
                <i />
                <i />
                {activeStep === 1 && <div className="scan-beam" />}
                {activeStep === 2 && (
                  <ShieldCheck
                    className="process-check"
                    size={60}
                    strokeWidth={1}
                  />
                )}
              </div>
              <span className="process-tag">
                <span className="status-dot" />
                {steps[activeStep].tag}
              </span>
              <span className="mono process-count">0{activeStep + 1} / 03</span>
            </div>
          </div>
        </section>

        <Workspace />

        <section className="solutions section-pad" id="solutions">
          <div className="section-heading reveal">
            <div>
              <span className="eyebrow dark-eyebrow">
                <span className="tiny-cross">+</span> СОЗДАНО ДЛЯ АВТОБИЗНЕСА
              </span>
              <h2>
                Меньше споров.
                <br />
                <span className="serif">Больше прозрачности.</span>
              </h2>
            </div>
            <p>
              От первого осмотра до передачи ключей.
              <br />
              Визуальная история на каждом этапе
              <br />
              работы с автомобилем.
            </p>
          </div>
          <div className="solutions-grid">
            {[
              {
                number: "01",
                title: "Дилерам и сервисам",
                text: "Фиксируйте состояние при приёмке и выдаче. Разбирайте спорные случаи по снимкам.",
                icon: Camera,
                tag: "ПРИЁМКА → ВЫДАЧА",
              },
              {
                number: "02",
                title: "Trade-in и выкупу",
                text: "Сравнивайте состояние машины при оценке и передаче. Замечайте изменения до сделки.",
                icon: RotateCcw,
                tag: "ОЦЕНКА → СДЕЛКА",
              },
              {
                number: "03",
                title: "Автопаркам и аренде",
                text: "Сопоставляйте фотографии до и после поездки. Сделайте передачу автомобиля прозрачнее.",
                icon: Layers3,
                tag: "ВЫДАЧА → ВОЗВРАТ",
              },
            ].map((item) => (
              <article className="solution-card reveal" key={item.number}>
                <div>
                  <span className="mono">/{item.number}</span>
                  <item.icon size={24} strokeWidth={1.5} />
                </div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <span className="mono solution-tag">{item.tag}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="faq-section section-pad">
          <div className="faq-heading reveal">
            <span className="eyebrow">
              <span className="tiny-cross">+</span> БЕЗ ЧЁРНОГО ЯЩИКА
            </span>
            <h2>
              Хорошие вопросы.
              <br />
              <span className="serif">Честные ответы.</span>
            </h2>
            <p>
              Технологии можно доверять,
              <br />
              когда понятны её возможности.
            </p>
          </div>
          <div className="faq-list reveal">
            {faqs.map(([q, a], i) => (
              <div className={`faq ${openFaq === i ? "expanded" : ""}`} key={q}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                  aria-controls={`faq-${i}`}
                >
                  <span>{q}</span>
                  {openFaq === i ? <Minus size={20} /> : <Plus size={20} />}
                </button>
                <div id={`faq-${i}`} hidden={openFaq !== i}>
                  <p>{a}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="final-cta section-pad">
          <div className="cta-fingerprint">
            <Fingerprint size={370} strokeWidth={0.5} />
          </div>
          <div className="reveal">
            <span className="eyebrow dark-eyebrow">
              SEE THE DETAILS. KNOW THE STORY.
            </span>
            <h2>
              Посмотрите на автомобиль
              <br />
              <span className="serif">внимательнее.</span>
            </h2>
            <a href="#workspace" className="button button-dark">
              Начать первую проверку <ArrowUpRight size={21} />
            </a>
          </div>
          <span className="cta-corner">
            <ArrowUpRight size={56} strokeWidth={1} />
          </span>
        </section>
      </main>
      <footer className="footer">
        <div className="footer-top">
          <Brand footer />
          <p>Каждая деталь рассказывает историю.</p>
          <a href="#top">
            Наверх <ArrowRight size={17} className="up-arrow" />
          </a>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} CarPrint. Verification intelligence.
          </span>
          <span>Прототип · Partner Product</span>
          <a href="#workspace">
            Создано, чтобы видеть больше <ChevronRight size={14} />
          </a>
        </div>
      </footer>
    </>
  );
}
