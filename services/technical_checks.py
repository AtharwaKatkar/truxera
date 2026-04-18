"""
services/technical_checks.py
────────────────────────────────────────────────────────────
Real-time technical verification for any domain.

Checks performed (all with hard timeouts, all fail-safe):
  1. SSL/HTTPS — is the cert valid? what's the expiry?
  2. HTTP redirect — does http:// redirect to https://?
  3. DNS resolution — does the domain resolve at all?
  4. Response time — how fast does the server respond?
  5. Server headers — server type, security headers present?

These run in parallel alongside WHOIS + GSB + scraper.
Never raises — always returns a safe fallback dict.
"""

import asyncio
import ssl
import socket
import time
from datetime import datetime, timezone
from typing import Optional
import httpx

TIMEOUT = 6   # seconds per check


# ── SSL CHECK ─────────────────────────────────────────────

async def check_ssl(domain: str) -> dict:
    """
    Verify SSL certificate validity and expiry.
    Returns structured result — never raises.
    """
    result = {
        "has_ssl":          False,
        "ssl_valid":        False,
        "ssl_expiry_days":  None,
        "ssl_issuer":       None,
        "ssl_error":        None,
    }
    try:
        ctx = ssl.create_default_context()
        loop = asyncio.get_event_loop()

        def _check():
            with socket.create_connection((domain, 443), timeout=TIMEOUT) as sock:
                with ctx.wrap_socket(sock, server_hostname=domain) as ssock:
                    cert = ssock.getpeercert()
                    return cert

        cert = await asyncio.wait_for(
            loop.run_in_executor(None, _check),
            timeout=TIMEOUT
        )

        result["has_ssl"]   = True
        result["ssl_valid"] = True

        # Expiry
        expiry_str = cert.get("notAfter", "")
        if expiry_str:
            try:
                expiry = datetime.strptime(expiry_str, "%b %d %H:%M:%S %Y %Z")
                expiry = expiry.replace(tzinfo=timezone.utc)
                days   = (expiry - datetime.now(timezone.utc)).days
                result["ssl_expiry_days"] = days
            except Exception:
                pass

        # Issuer
        issuer = dict(x[0] for x in cert.get("issuer", []))
        result["ssl_issuer"] = issuer.get("organizationName") or issuer.get("O")

    except ssl.SSLCertVerificationError as e:
        result["has_ssl"]   = True   # has SSL but cert is invalid
        result["ssl_valid"] = False
        result["ssl_error"] = "Certificate verification failed"
    except (socket.timeout, asyncio.TimeoutError):
        result["ssl_error"] = "SSL check timed out"
    except ConnectionRefusedError:
        result["ssl_error"] = "Port 443 not open"
    except socket.gaierror:
        result["ssl_error"] = "DNS resolution failed"
    except Exception as e:
        result["ssl_error"] = f"SSL check failed: {type(e).__name__}"

    return result


# ── HTTP → HTTPS REDIRECT CHECK ───────────────────────────

async def check_https_redirect(domain: str) -> dict:
    """
    Check if http:// redirects to https://.
    Also captures response time and basic server info.
    """
    result = {
        "redirects_to_https": False,
        "response_time_ms":   None,
        "status_code":        None,
        "server_header":      None,
        "security_headers":   {},
        "error":              None,
    }
    try:
        start = time.monotonic()
        async with httpx.AsyncClient(
            timeout=TIMEOUT,
            follow_redirects=True,
            verify=False,   # we check SSL separately
        ) as client:
            resp = await client.get(f"http://{domain}")

        elapsed = round((time.monotonic() - start) * 1000)
        result["response_time_ms"] = elapsed
        result["status_code"]      = resp.status_code

        # Did we end up on https?
        final_url = str(resp.url)
        result["redirects_to_https"] = final_url.startswith("https://")

        # Server header
        result["server_header"] = resp.headers.get("server", "").split("/")[0][:50] or None

        # Security headers
        h = resp.headers
        result["security_headers"] = {
            "x_frame_options":        "x-frame-options" in h,
            "x_content_type_options": "x-content-type-options" in h,
            "strict_transport_security": "strict-transport-security" in h,
            "content_security_policy":   "content-security-policy" in h,
        }

    except httpx.TimeoutException:
        result["error"] = "Request timed out"
    except httpx.ConnectError:
        result["error"] = "Could not connect"
    except Exception as e:
        result["error"] = f"HTTP check failed: {type(e).__name__}"

    return result


# ── DNS CHECK ─────────────────────────────────────────────

async def check_dns(domain: str) -> dict:
    """Quick DNS resolution check."""
    result = {"resolves": False, "ip_address": None, "error": None}
    try:
        loop = asyncio.get_event_loop()
        info = await asyncio.wait_for(
            loop.run_in_executor(None, socket.gethostbyname, domain),
            timeout=5
        )
        result["resolves"]   = True
        result["ip_address"] = info
    except asyncio.TimeoutError:
        result["error"] = "DNS timeout"
    except socket.gaierror as e:
        result["error"] = f"DNS failed: {e.args[1] if e.args else 'unknown'}"
    except Exception as e:
        result["error"] = f"DNS error: {type(e).__name__}"
    return result


# ── COMBINED TECHNICAL ANALYSIS ───────────────────────────

async def run_technical_checks(domain: str) -> dict:
    """
    Run all technical checks in parallel.
    Returns a unified dict with all signals.
    Always returns — never raises.
    """
    ssl_result, redirect_result, dns_result = await asyncio.gather(
        check_ssl(domain),
        check_https_redirect(domain),
        check_dns(domain),
        return_exceptions=True,
    )

    # Handle any unexpected exceptions from gather
    if isinstance(ssl_result, Exception):
        ssl_result = {"has_ssl": False, "ssl_valid": False, "ssl_expiry_days": None,
                      "ssl_issuer": None, "ssl_error": str(ssl_result)}
    if isinstance(redirect_result, Exception):
        redirect_result = {"redirects_to_https": False, "response_time_ms": None,
                           "status_code": None, "server_header": None,
                           "security_headers": {}, "error": str(redirect_result)}
    if isinstance(dns_result, Exception):
        dns_result = {"resolves": False, "ip_address": None, "error": str(dns_result)}

    return {
        "ssl":      ssl_result,
        "http":     redirect_result,
        "dns":      dns_result,
        "checked_at": datetime.utcnow().isoformat(),
    }


# ── SIGNAL EXTRACTION FOR TRUST SCORE ────────────────────

def extract_tech_signals(tech: dict) -> tuple[int, list[str], dict]:
    """
    Convert raw technical check results into:
      - penalty (int, 0–25)
      - reasons (list of human-readable strings)
      - checks (dict for verified_checks block)

    Returns (penalty, reasons, checks).
    """
    penalty = 0
    reasons = []
    checks  = {}

    ssl = tech.get("ssl", {})
    http = tech.get("http", {})
    dns  = tech.get("dns", {})

    # DNS
    if dns.get("resolves") is False and dns.get("error"):
        penalty += 10
        reasons.append("Domain does not resolve — may be inactive or fake")
        checks["dns_resolves"] = False
    elif dns.get("resolves"):
        checks["dns_resolves"] = True

    # SSL
    if ssl.get("has_ssl"):
        if ssl.get("ssl_valid"):
            checks["ssl_valid"] = True
            expiry = ssl.get("ssl_expiry_days")
            if expiry is not None:
                checks["ssl_expiry_days"] = expiry
                if expiry < 0:
                    penalty += 15
                    reasons.append("SSL certificate has expired")
                elif expiry < 14:
                    penalty += 8
                    reasons.append(f"SSL certificate expires in {expiry} days")
            if ssl.get("ssl_issuer"):
                checks["ssl_issuer"] = ssl["ssl_issuer"]
        else:
            penalty += 12
            reasons.append("SSL certificate is invalid or untrusted")
            checks["ssl_valid"] = False
    else:
        if not ssl.get("ssl_error") or "timed out" not in (ssl.get("ssl_error") or ""):
            penalty += 8
            reasons.append("No HTTPS / SSL certificate detected")
        checks["ssl_valid"] = False

    # HTTPS redirect
    if http.get("redirects_to_https") is False and not http.get("error"):
        penalty += 3
        reasons.append("Website does not redirect HTTP to HTTPS")
        checks["redirects_to_https"] = False
    elif http.get("redirects_to_https"):
        checks["redirects_to_https"] = True

    # Response time
    rt = http.get("response_time_ms")
    if rt is not None:
        checks["response_time_ms"] = rt
        if rt > 5000:
            reasons.append(f"Very slow response time ({rt}ms)")

    # Security headers
    sec = http.get("security_headers", {})
    if sec:
        checks["security_headers"] = sec
        missing = [k for k, v in sec.items() if not v]
        if len(missing) >= 3:
            reasons.append("Missing important security headers")

    return min(penalty, 25), reasons, checks
