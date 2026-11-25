import time
from collections import defaultdict
from fastapi import HTTPException, Request, status


class RateLimiter:
    """Keeps request times per key and rejects a key that goes over the limit."""

    def __init__(self):
        self._requests = defaultdict(list)

    def check(self, key, max_requests, window_seconds=60):
        now = time.time()
        recent = [t for t in self._requests[key] if t > now - window_seconds]
        self._requests[key] = recent

        if len(recent) >= max_requests:
            retry_after = int(window_seconds - (now - recent[0])) + 1
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Try again in {retry_after} seconds.",
                headers={"Retry-After": str(retry_after)},
            )
        recent.append(now)


rate_limiter = RateLimiter()


def rate_limit(max_requests, window_seconds=60):
    """Use as a route dependency to limit requests per client and path."""
    def dependency(request: Request):
        host = request.client.host if request.client else "unknown"
        rate_limiter.check(f"{host}:{request.url.path}", max_requests, window_seconds)
    return dependency
