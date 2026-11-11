import time
from collections import defaultdict
from typing import Dict, List
from fastapi import HTTPException, Request, status


class InMemoryRateLimiter:
    """Simple sliding-window rate limiter per client IP / key."""
    def __init__(self):
        self._requests: Dict[str, List[float]] = defaultdict(list)

    def check(self, key: str, max_requests: int, window_seconds: int = 60) -> None:
        now = time.time()
        window_start = now - window_seconds
        
        # Clean older requests
        timestamps = [ts for ts in self._requests[key] if ts > window_start]
        self._requests[key] = timestamps

        if len(timestamps) >= max_requests:
            retry_after = int(window_seconds - (now - timestamps[0])) + 1
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Try again in {retry_after} seconds.",
                headers={"Retry-After": str(retry_after)}
            )

        self._requests[key].append(now)


rate_limiter = InMemoryRateLimiter()


def rate_limit(max_requests: int, window_seconds: int = 60):
    """Dependency helper for endpoints."""
    def dependency(request: Request):
        client_host = request.client.host if request.client else "unknown"
        path = request.url.path
        key = f"{client_host}:{path}"
        rate_limiter.check(key, max_requests=max_requests, window_seconds=window_seconds)
    return dependency
