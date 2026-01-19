
from playwright.sync_api import sync_playwright

def verify_login_page():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the local server
        page.goto("http://localhost:8080/index.html")

        # Check for key elements
        # 1. Title "Financeiro"
        page.wait_for_selector("text=Financeiro")

        # 2. Email input
        page.wait_for_selector("input[name='email']")

        # 3. Take screenshot
        page.screenshot(path="verification_login.png")

        browser.close()

if __name__ == "__main__":
    verify_login_page()
