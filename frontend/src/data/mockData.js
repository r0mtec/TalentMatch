export const gradeOptions = ["Junior", "Middle", "Senior", "Lead"];
export const statusOptions = ["active", "draft", "closed"];
export const technologyGroups = ["languages", "frameworks", "databases", "infrastructure", "other"];

export const currentUser = {
  id: "user-1",
  fullName: "Анна Смирнова",
  initials: "АС",
  login: "anna.smirnova",
  role: "account_manager",
  created_at: "2026-05-20",
};

export const users = [
  currentUser,
  { id: "user-2", fullName: "Олег Кузнецов", initials: "ОК", login: "oleg.kuznetsov", role: "leader", created_at: "2026-05-21" },
  { id: "user-3", fullName: "Елена Орлова", initials: "ЕО", login: "elena.orlova", role: "admin", created_at: "2026-05-22" },
];

export const technologies = [
  { id: "php", name: "PHP", group: "languages", synonyms: ["php8", "php 8", "php 8.2"] },
  { id: "laravel", name: "Laravel", group: "frameworks", synonyms: [] },
  { id: "symfony", name: "Symfony", group: "frameworks", synonyms: [] },
  { id: "react", name: "React", group: "frameworks", synonyms: ["react.js"] },
  { id: "typescript", name: "TypeScript", group: "languages", synonyms: ["ts"] },
  { id: "nodejs", name: "Node.js", group: "languages", synonyms: ["node", "nodejs"] },
  { id: "python", name: "Python", group: "languages", synonyms: [] },
  { id: "django", name: "Django", group: "frameworks", synonyms: [] },
  { id: "postgresql", name: "PostgreSQL", group: "databases", synonyms: ["postgres"] },
  { id: "mysql", name: "MySQL", group: "databases", synonyms: [] },
  { id: "redis", name: "Redis", group: "databases", synonyms: [] },
  { id: "docker", name: "Docker", group: "infrastructure", synonyms: [] },
  { id: "kubernetes", name: "Kubernetes", group: "infrastructure", synonyms: ["k8s"] },
  { id: "kafka", name: "Kafka", group: "infrastructure", synonyms: [] },
  { id: "rest-api", name: "REST API", group: "other", synonyms: ["rest"] },
  { id: "openapi", name: "OpenAPI", group: "other", synonyms: ["swagger"] },
  { id: "gitlab-ci", name: "GitLab CI", group: "infrastructure", synonyms: ["ci/cd", "cicd"] },
  { id: "nginx", name: "Nginx", group: "infrastructure", synonyms: [] },
  { id: "linux", name: "Linux", group: "infrastructure", synonyms: [] },
];

export const requests = [
  {
    id: "REQ-001",
    position: "Backend Developer",
    grade: "Senior",
    description: "GovTech проект с высоконагруженным личным кабинетом.",
    tasks: "Разработка backend API, интеграции, работа с БД",
    location: "Москва / Удалённо",
    citizenship: "РФ",
    workload: "Full-time",
    startDate: "2026-07-01",
    engagementPeriod: "До конца проекта",
    createdAt: "2026-06-12",
    status: "active",
    mustHave: [
      { id: "req-1", title: "PHP", technologyId: "php", weight: 4 },
      { id: "req-2", title: "PHP 8", technologyId: "php", weight: 3 },
      { id: "req-3", title: "Laravel", technologyId: "laravel", weight: 4 },
      { id: "req-4", title: "PostgreSQL", technologyId: "postgresql", weight: 3 },
      { id: "req-5", title: "REST API", technologyId: "rest-api", weight: 3 },
    ],
    niceToHave: [
      { id: "req-6", title: "Docker", technologyId: "docker", weight: 2 },
      { id: "req-7", title: "CI/CD", technologyId: "gitlab-ci", weight: 2 },
      { id: "req-8", title: "Kubernetes", technologyId: "kubernetes", weight: 1 },
    ],
  },
  {
    id: "REQ-002",
    position: "Frontend Developer",
    grade: "Middle",
    description: "Клиентский кабинет для B2B-пользователей.",
    tasks: "Развитие интерфейса, работа с дизайн-системой, интеграция REST API",
    location: "Санкт-Петербург",
    citizenship: "",
    workload: "Full-time",
    startDate: "2026-07-10",
    engagementPeriod: "6 месяцев",
    createdAt: "2026-06-10",
    status: "active",
    mustHave: [
      { id: "req-9", title: "React", technologyId: "react", weight: 4 },
      { id: "req-10", title: "TypeScript", technologyId: "typescript", weight: 4 },
    ],
    niceToHave: [{ id: "req-11", title: "OpenAPI", technologyId: "openapi", weight: 2 }],
  },
  {
    id: "REQ-003",
    position: "DevOps Engineer",
    grade: "Lead",
    description: "Платформа доставки и наблюдаемости.",
    tasks: "CI/CD, Kubernetes, поддержка Linux-инфраструктуры",
    location: "Удалённо",
    citizenship: "",
    workload: "Full-time",
    startDate: "2026-07-20",
    engagementPeriod: "Бессрочно",
    createdAt: "2026-06-05",
    status: "draft",
    mustHave: [
      { id: "req-12", title: "Docker", technologyId: "docker", weight: 3 },
      { id: "req-13", title: "Kubernetes", technologyId: "kubernetes", weight: 4 },
    ],
    niceToHave: [
      { id: "req-14", title: "GitLab CI", technologyId: "gitlab-ci", weight: 2 },
      { id: "req-15", title: "Linux", technologyId: "linux", weight: 2 },
    ],
  },
  {
    id: "REQ-004",
    position: "Data Scientist",
    grade: "Senior",
    description: "ML-модели для скоринга и сегментации.",
    tasks: "Подготовка данных, обучение моделей, аналитика",
    location: "Москва",
    citizenship: "",
    workload: "Full-time",
    startDate: "2026-08-01",
    engagementPeriod: "3 месяца",
    createdAt: "2026-05-28",
    status: "closed",
    mustHave: [
      { id: "req-16", title: "Python", technologyId: "python", weight: 4 },
      { id: "req-17", title: "PostgreSQL", technologyId: "postgresql", weight: 2 },
    ],
    niceToHave: [{ id: "req-18", title: "Docker", technologyId: "docker", weight: 1 }],
  },
  {
    id: "REQ-005",
    position: "QA Engineer",
    grade: "Junior",
    description: "Регрессионное тестирование веб-приложений.",
    tasks: "Проверка API, тест-дизайн, заведение дефектов",
    location: "Казань",
    citizenship: "",
    workload: "Full-time",
    startDate: "2026-07-05",
    engagementPeriod: "Бессрочно",
    createdAt: "2026-06-01",
    status: "active",
    mustHave: [{ id: "req-19", title: "REST API", technologyId: "rest-api", weight: 2 }],
    niceToHave: [{ id: "req-20", title: "PostgreSQL", technologyId: "postgresql", weight: 1 }],
  },
];

const skill = (id, technologyId, title, sourceText) => ({
  id,
  technologyId,
  technology_id: technologyId,
  title,
  normalized_name: title.toLowerCase(),
  raw_text: title,
  text_source: sourceText,
  sourceText,
  confidence: 95,
  source_section: "skills",
  is_manual: false,
});

export const candidates = [
  {
    id: "cand-1",
    fullName: "Иванов Алексей Сергеевич",
    grade: "Senior",
    location: "Москва",
    uploadedAt: "2026-06-15",
    fileName: "ivanov_backend.pdf",
    skills: [
      skill("skill-1", "php", "PHP", "Опыт коммерческой разработки на PHP 8"),
      skill("skill-2", "laravel", "Laravel", "Разработка сервисов на Laravel"),
      skill("skill-3", "postgresql", "PostgreSQL", "Оптимизация запросов PostgreSQL"),
      skill("skill-4", "rest-api", "REST API", "Проектирование REST API"),
      skill("skill-5", "docker", "Docker", "Контейнеризация сервисов Docker"),
    ],
  },
  {
    id: "cand-2",
    fullName: "Петрова Мария Ивановна",
    grade: "Middle",
    location: "Санкт-Петербург",
    uploadedAt: "2026-06-18",
    fileName: "petrova_frontend.docx",
    skills: [
      skill("skill-6", "react", "React", "Разработка интерфейсов на React"),
      skill("skill-7", "typescript", "TypeScript", "Типизация клиентских модулей"),
      skill("skill-8", "openapi", "OpenAPI", "Генерация клиентов по OpenAPI"),
      skill("skill-9", "nodejs", "Node.js", "Node.js для сборочных инструментов"),
    ],
  },
  {
    id: "cand-3",
    fullName: "Сидоров Дмитрий Олегович",
    grade: "Lead",
    location: "Екатеринбург",
    uploadedAt: "2026-06-16",
    fileName: "sidorov_devops.pdf",
    skills: [
      skill("skill-10", "docker", "Docker", "Сборка Docker-образов"),
      skill("skill-11", "kubernetes", "Kubernetes", "Поддержка production Kubernetes"),
      skill("skill-12", "gitlab-ci", "GitLab CI", "Пайплайны GitLab CI"),
      skill("skill-13", "linux", "Linux", "Администрирование Linux"),
    ],
  },
  {
    id: "cand-4",
    fullName: "Козлова Анна Викторовна",
    grade: "Senior",
    location: "Новосибирск",
    uploadedAt: "2026-06-13",
    fileName: "kozlova_ds.pdf",
    skills: [
      skill("skill-14", "python", "Python", "ML-проекты на Python"),
      skill("skill-15", "django", "Django", "Backend на Django"),
      skill("skill-16", "postgresql", "PostgreSQL", "Работа с PostgreSQL"),
      skill("skill-17", "kafka", "Kafka", "Потоковая обработка через Kafka"),
    ],
  },
  {
    id: "cand-5",
    fullName: "Новиков Роман Павлович",
    grade: "Middle",
    location: "Удалённо",
    uploadedAt: "2026-06-09",
    fileName: "novikov_backend.docx",
    skills: [
      skill("skill-18", "php", "PHP", "Поддержка PHP-приложений"),
      skill("skill-19", "symfony", "Symfony", "Symfony backend"),
      skill("skill-20", "mysql", "MySQL", "Проектирование MySQL-схем"),
      skill("skill-21", "redis", "Redis", "Кеширование в Redis"),
    ],
  },
];

requests.forEach((request) => {
  request.post = request.position;
  request.employment_date = request.startDate;
  request.engagement_period = request.engagementPeriod;
  request.created_by = "user-1";
  request.created_at = request.createdAt;
  request.updated_at = request.createdAt;
  [...request.mustHave, ...request.niceToHave].forEach((requirement) => {
    requirement.request_id = request.id;
    requirement.technology_id = requirement.technologyId;
    requirement.raw_text = requirement.title;
    requirement.created_at = request.createdAt;
    requirement.updated_at = request.createdAt;
  });
});

candidates.forEach((candidate) => {
  candidate.fio = candidate.fullName;
  candidate.citizenship = candidate.citizenship || "РФ";
  candidate.languages = candidate.languages || "Русский";
  candidate.recognized_text = candidate.recognized_text || `Распознанный mock-текст резюме ${candidate.fileName}. Ключевые навыки: ${candidate.skills.map((item) => item.title).join(", ")}.`;
  candidate.file_storage_key = `mock/${candidate.fileName}`;
  candidate.original_file_name = candidate.fileName;
  candidate.file_mime_type = candidate.fileName?.endsWith(".docx") ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/pdf";
  candidate.file_size = 1200000;
  candidate.file_checksum = `mock-checksum-${candidate.id}`;
  candidate.parsing_status = "parsed";
  candidate.recognition_status = "recognized";
  candidate.created_by = "user-1";
  candidate.created_at = candidate.uploadedAt;
  candidate.updated_at = candidate.uploadedAt;
  candidate.recognizedSkills = candidate.skills.map((item) => ({ ...item, candidate_id: candidate.id, created_at: candidate.uploadedAt, updated_at: candidate.uploadedAt }));
});

export const technologySynonyms = technologies.flatMap((technology) =>
  technology.synonyms.map((synonym, index) => ({
    id: `${technology.id}-syn-${index}`,
    technology_id: technology.id,
    synonym,
  })),
);

export const requirements = requests.flatMap((request) =>
  [...request.mustHave, ...request.niceToHave].map((requirement) => ({ ...requirement })),
);

export const candidateSkills = candidates.flatMap((candidate) => candidate.recognizedSkills.map((skill) => ({ ...skill })));

export const assessments = [];
export const assessmentRequirementResults = [];
