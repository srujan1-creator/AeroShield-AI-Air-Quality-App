"""
AeroShield AI - O(1) LRU Cache with 5-Minute TTL
Implements high-performance Least-Recently-Used caching with node doubly-linked list,
hash map index, TTL expiration, and telemetry metrics.
"""

import time
from typing import Any, Optional, Dict


class Node:
    __slots__ = ("key", "val", "expires_at", "prev", "next")

    def __init__(self, key: str, val: Any, expires_at: float):
        self.key = key
        self.val = val
        self.expires_at = expires_at
        self.prev: Optional["Node"] = None
        self.next: Optional["Node"] = None


class LRUCacheWithTTL:
    """
    O(1) LRU Cache with Time-To-Live (TTL).
    Uses a Doubly Linked List + Hash Map to guarantee strict O(1) get and set operations.
    Default TTL: 300 seconds (5 minutes).
    """

    def __init__(self, capacity: int = 128, default_ttl: float = 300.0):
        if capacity <= 0:
            raise ValueError("Cache capacity must be strictly positive")
        self.capacity = capacity
        self.default_ttl = default_ttl
        self.map: Dict[str, Node] = {}
        
        # Sentinel dummy nodes for O(1) list manipulation without boundary checks
        self.head = Node("__HEAD__", None, float("inf"))
        self.tail = Node("__TAIL__", None, float("inf"))
        self.head.next = self.tail
        self.tail.prev = self.head

        # Telemetry metrics
        self.hits: int = 0
        self.misses: int = 0
        self.evictions: int = 0
        self.expirations: int = 0

    def _remove(self, node: Node) -> None:
        """Detach an existing node from the doubly linked list in O(1) time."""
        p = node.prev
        n = node.next
        if p:
            p.next = n
        if n:
            n.prev = p

    def _add_to_front(self, node: Node) -> None:
        """Insert node right after head sentinel (most recently used) in O(1) time."""
        first = self.head.next
        node.prev = self.head
        node.next = first
        self.head.next = node
        if first:
            first.prev = node

    def _move_to_front(self, node: Node) -> None:
        """Move existing node to most recently used position in O(1) time."""
        self._remove(node)
        self._add_to_front(node)

    def get(self, key: str) -> Optional[Any]:
        """
        Retrieve value from cache in O(1) time.
        Returns None if key is absent or expired.
        """
        now = time.time()
        node = self.map.get(key)
        
        if node is None:
            self.misses += 1
            return None

        # Check TTL expiration
        if now > node.expires_at:
            # Entry has expired
            self._remove(node)
            del self.map[key]
            self.misses += 1
            self.expirations += 1
            return None

        # Cache Hit: move node to front of LRU chain
        self._move_to_front(node)
        self.hits += 1
        return node.val

    def set(self, key: str, val: Any, ttl: Optional[float] = None) -> None:
        """
        Store key-value pair in cache in O(1) time with specified or default TTL.
        """
        now = time.time()
        ttl_seconds = ttl if ttl is not None else self.default_ttl
        expires_at = now + ttl_seconds

        if key in self.map:
            # Update existing node
            node = self.map[key]
            node.val = val
            node.expires_at = expires_at
            self._move_to_front(node)
            return

        # Check capacity eviction
        if len(self.map) >= self.capacity:
            # Evict Least Recently Used (node before tail)
            lru_node = self.tail.prev
            if lru_node and lru_node != self.head:
                self._remove(lru_node)
                del self.map[lru_node.key]
                self.evictions += 1

        # Insert new node
        new_node = Node(key, val, expires_at)
        self.map[key] = new_node
        self._add_to_front(new_node)

    def delete(self, key: str) -> bool:
        """Remove a key from cache in O(1) time."""
        node = self.map.get(key)
        if node:
            self._remove(node)
            del self.map[key]
            return True
        return False

    def clear(self) -> None:
        """Reset cache to empty state."""
        self.map.clear()
        self.head.next = self.tail
        self.tail.prev = self.head
        self.hits = 0
        self.misses = 0
        self.evictions = 0
        self.expirations = 0

    def size(self) -> int:
        """Return count of currently stored entries."""
        return len(self.map)

    def get_stats(self) -> Dict[str, Any]:
        """Return cache health and efficiency metrics."""
        total_queries = self.hits + self.misses
        hit_rate = round((self.hits / total_queries * 100), 2) if total_queries > 0 else 0.0
        return {
            "capacity": self.capacity,
            "size": len(self.map),
            "hits": self.hits,
            "misses": self.misses,
            "evictions": self.evictions,
            "expirations": self.expirations,
            "hit_rate_pct": hit_rate,
            "ttl_seconds": self.default_ttl
        }


# Global cache instance for query/AI results with 5-minute (300s) TTL
ai_lru_cache = LRUCacheWithTTL(capacity=200, default_ttl=300.0)
