"""
One-off script to seed a handful of realistic-looking incidents so the
dashboard has something to display during development/demo, without
waiting on live detections. Safe to run multiple times (just adds more
rows) or skip entirely once real usage populates the feed.
"""

import requests

BASE_URL = "http://127.0.0.1:8000"

SAMPLES = [
    {"type": "url", "content": "http://paypal-secure-login.verify-account.tk/signin"},
    {"type": "url", "content": "https://github.com"},
    {"type": "url", "content": "http://amaz0n-account-suspended.xyz/verify?token=abc123"},
    {"type": "sms", "content": "URGENT: Your bank account has been suspended. Verify your identity now: http://secure-bank-verify.tk/login"},
    {"type": "sms", "content": "Hey are we still meeting for lunch tomorrow?"},
    {"type": "email", "content": "Congratulations! You've won a $1000 gift card. Claim now before it expires: http://prize-claim.xyz"},
    {"type": "url", "content": "https://www.wikipedia.org"},
    {"type": "sms", "content": "Your OTP is 583920. Do not share this with anyone. Click here to verify: bit.ly/xyz"},
    {"type": "url", "content": "http://192.168.0.1/wp-admin/paypal-login.html"},
    {"type": "email", "content": "Your package could not be delivered. Pay a small customs fee to reschedule: http://track-fee.com"},
]

for sample in SAMPLES:
    try:
        r = requests.post(f"{BASE_URL}/api/detect", json=sample, timeout=30)
        data = r.json()
        print(f"[{data.get('risk_score', '?')}] {sample['type']}: {sample['content'][:60]}")
    except Exception as e:
        print(f"FAILED: {sample['content'][:60]} - {e}")
