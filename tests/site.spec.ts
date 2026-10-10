import { test, expect } from "@playwright/test";

test("example goes through server, displays geometry, supports overlay and report download", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page
    .getByRole("link", { name: "Проверить автомобиль", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Сравнить снимки" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Как фотографировать" }).click();
  await expect(
    page.getByText("Одна и та же деталь", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Использовать пример" }).click();
  await expect(page.getByText(/Синтетический пример:/)).toBeVisible();
  await page.getByRole("button", { name: "Сравнить снимки" }).click();
  await expect(
    page.getByRole("heading", { name: "Геометрическое соответствие найдено" }),
  ).toBeVisible();
  await expect(page.getByText("REVIEW · проверка экспертом")).toBeVisible();
  await page.getByRole("button", { name: "Совмещение", exact: true }).click();
  const slider = page.getByRole("slider", {
    name: "Положение разделителя сравнения",
  });
  await slider.fill("70");
  await expect(slider).toHaveValue("70");
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Скачать отчёт" }).click();
  expect((await downloaded).suggestedFilename()).toMatch(
    /^carprint-report-.*\.json$/,
  );
  await page.getByRole("button", { name: "Удалить исходный осмотр" }).click();
  await expect(
    page.getByRole("button", { name: "Сравнить снимки" }),
  ).toBeDisabled();
  await expect(page.locator(".results")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("accepts user photo uploads and rejects unsupported files", async ({
  page,
}) => {
  await page.goto("/#workspace");
  const inputs = page.locator("input[type=file]");
  await inputs
    .nth(0)
    .setInputFiles({
      name: "invalid.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from("<svg></svg>"),
    });
  await expect(page.getByRole("alert")).toContainText(
    "Выберите JPG, PNG или WebP",
  );
  await inputs.nth(0).setInputFiles("public/images/car-studio.png");
  await inputs.nth(1).setInputFiles("public/images/car-studio.png");
  await page.getByRole("button", { name: "Сравнить снимки" }).click();
  await expect(
    page.getByRole("heading", { name: "Геометрическое соответствие найдено" }),
  ).toBeVisible();
  await expect(page.getByText(/Загружен один и тот же файл/)).toBeVisible();
});

test("server errors are recoverable and never show fabricated results", async ({
  page,
}) => {
  await page.goto("/#workspace");
  await page.getByRole("button", { name: "Использовать пример" }).click();
  await page.route("**/api/compare", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ detail: "Сервис временно недоступен" }),
    }),
  );
  await page.getByRole("button", { name: "Сравнить снимки" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Сервис временно недоступен",
  );
  await expect(page.locator(".results")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Сравнить снимки" }),
  ).toBeEnabled();
});

test("mobile navigation, disclosure controls, responsive layout and reduced motion work", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".intro")).toHaveCount(0);
  await page.getByRole("button", { name: "Открыть меню" }).click();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Технология" })
    .click();
  await expect(
    page.getByRole("button", { name: "Открыть меню" }),
  ).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("button", { name: "02 Сопоставьте детали" }).click();
  await expect(page.getByText("Локальные признаки + геометрия")).toBeVisible();
  await page
    .getByRole("button", { name: "Что уже работает в прототипе?" })
    .click();
  await expect(page.locator("#faq-1")).toBeVisible();
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
  }
});
