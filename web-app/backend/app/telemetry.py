"""In-memory telemetry and operational metrics tracker (privacy-preserving).
Collects latency percentiles and error aggregates with no user or image data.
"""

import time
import numpy as np
from typing import Dict, Any, List

class TelemetryCollector:
    def __init__(self):
        self.start_time = time.time()
        self.latencies: List[float] = []
        self.status_counts: Dict[int, int] = {}
        self.endpoint_counts: Dict[str, int] = {}

    def record(self, path: str, status_code: int, latency_ms: float):
        self.latencies.append(latency_ms)
        # Keep last 10,000 latencies to bound memory
        if len(self.latencies) > 10000:
            self.latencies.pop(0)

        self.status_counts[status_code] = self.status_counts.get(status_code, 0) + 1
        self.endpoint_counts[path] = self.endpoint_counts.get(path, 0) + 1

    def get_summary(self) -> Dict[str, Any]:
        uptime_sec = round(time.time() - self.start_time, 1)
        total_requests = len(self.latencies)
        error_count = sum(count for code, count in self.status_counts.items() if code >= 400)

        if self.latencies:
            arr = np.array(self.latencies)
            p50 = round(float(np.percentile(arr, 50)), 2)
            p90 = round(float(np.percentile(arr, 90)), 2)
            p99 = round(float(np.percentile(arr, 99)), 2)
            mean_latency = round(float(np.mean(arr)), 2)
        else:
            p50 = p90 = p99 = mean_latency = 0.0

        return {
            "uptime_seconds": uptime_sec,
            "total_requests": total_requests,
            "error_count": error_count,
            "status_distribution": self.status_counts,
            "latency_percentiles_ms": {
                "p50": p50,
                "p90": p90,
                "p99": p99,
                "mean": mean_latency
            },
            "endpoint_counts": self.endpoint_counts
        }

telemetry = TelemetryCollector()

