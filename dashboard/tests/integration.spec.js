const { test, expect } = require('@playwright/test');

test('DivyaDrishti Full Journey', async ({ page }) => {
  // 1. Landing Page
  await page.goto('http://localhost:5173/');
  
  // Wait for the hero section to load
  await expect(page.locator('text=DIVYADRISHTI')).toBeVisible();
  
  // Click 'Explore DivyaDrishti' to go to login
  await page.click('button:has-text("Explore DivyaDrishti")');
  
  // 2. Login Page
  await expect(page).toHaveURL(/.*login/);
  await expect(page.locator('text=Welcome back.')).toBeVisible();
  
  // Use Demo Override to skip RFID hardware
  await page.click('button:has-text("Manual Override (Demo)")');
  
  // Wait for the boot sequence (6 items + 1s redirect)
  await expect(page.locator('text=System ready')).toBeVisible();
  
  // 3. Dashboard
  await expect(page).toHaveURL(/.*dashboard/);
  
  // Since we use ?demo=1 in the actual app to trigger the simulation, 
  // let's navigate with the demo flag to test the emergency sequence
  await page.goto('http://localhost:5173/dashboard?demo=1');
  
  // Check if speed is visible
  await expect(page.locator('text=KM/H')).toBeVisible();
  
  // Wait for the emergency sequence (which happens after ~15-20s in demo loop)
  // Increase timeout for this specific expectation
  await expect(page.locator('text=Impact detected.')).toBeVisible({ timeout: 25000 });
  
  // Validate "Cancel Protocol" is available
  const cancelButton = page.locator('button:has-text("Cancel Protocol")');
  await expect(cancelButton).toBeVisible();
  
  // Cancel the emergency
  await cancelButton.click();
  
  // Verify emergency overlay is gone
  await expect(page.locator('text=Impact detected.')).not.toBeVisible();
});
