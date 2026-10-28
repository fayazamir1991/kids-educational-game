// Exercise the same written challenge an adult sees; no test bypass/session
// injection. The production challenge uses crypto independently of quiz seeds.
export async function solveParentGate(page) {
  const gate = page.locator('#parent-gate');
  await gate.waitFor({ state: 'visible' });
  const words = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
  const expected = await page.locator('[data-parent-step-word]').allTextContents();
  for (const word of expected) {
    const digit = words.indexOf(word.trim());
    if (digit < 1) throw new Error(`Unknown parent challenge word: ${word}`);
    await page.locator(`[data-parent-digit="${digit}"]`).click();
  }
  await gate.waitFor({ state: 'hidden' });
}

export async function openAdultSettings(page, selector = '#settings-button') {
  await page.locator(selector).click();
  if (await page.locator('#parent-gate').isVisible()) await solveParentGate(page);
  await page.locator('#settings-dialog').waitFor({ state: 'visible' });
}
