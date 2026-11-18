/**
 * AeroShield AI - Client-Side O(1) LRU Cache with 5-Minute TTL
 * Implements Doubly-Linked-List + Map for strict O(1) time complexity.
 */

(function (window) {
    'use strict';

    class CacheNode {
        constructor(key, value, expiresAt) {
            this.key = key;
            this.value = value;
            this.expiresAt = expiresAt;
            this.prev = null;
            this.next = null;
        }
    }

    class LRUCacheWithTTL {
        /**
         * @param {number} capacity Maximum entries before eviction
         * @param {number} defaultTTLMs Time-To-Live in milliseconds (default: 300,000ms = 5 minutes)
         */
        constructor(capacity = 100, defaultTTLMs = 300000) {
            if (capacity <= 0) throw new Error("Capacity must be positive");
            this.capacity = capacity;
            this.defaultTTLMs = defaultTTLMs;
            this.map = new Map();

            // Sentinel nodes to prevent boundary null checks
            this.head = new CacheNode('__HEAD__', null, Infinity);
            this.tail = new CacheNode('__TAIL__', null, Infinity);
            this.head.next = this.tail;
            this.tail.prev = this.head;

            // Telemetry metrics
            this.hits = 0;
            this.misses = 0;
            this.evictions = 0;
            this.expirations = 0;
        }

        _remove(node) {
            const p = node.prev;
            const n = node.next;
            if (p) p.next = n;
            if (n) n.prev = p;
        }

        _addToFront(node) {
            const first = this.head.next;
            node.prev = this.head;
            node.next = first;
            this.head.next = node;
            if (first) first.prev = node;
        }

        _moveToFront(node) {
            this._remove(node);
            this._addToFront(node);
        }

        /**
         * O(1) Retrieval
         */
        get(key) {
            const node = this.map.get(key);
            if (!node) {
                this.misses++;
                return null;
            }

            const now = Date.now();
            if (now > node.expiresAt) {
                // Expired
                this._remove(node);
                this.map.delete(key);
                this.misses++;
                this.expirations++;
                return null;
            }

            // Hit: update recency
            this._moveToFront(node);
            this.hits++;
            return node.value;
        }

        /**
         * O(1) Insertion
         */
        set(key, value, customTTLMs = null) {
            const now = Date.now();
            const ttl = customTTLMs !== null ? customTTLMs : this.defaultTTLMs;
            const expiresAt = now + ttl;

            if (this.map.has(key)) {
                const node = this.map.get(key);
                node.value = value;
                node.expiresAt = expiresAt;
                this._moveToFront(node);
                return;
            }

            // Evict LRU if capacity exceeded
            if (this.map.size >= this.capacity) {
                const lruNode = this.tail.prev;
                if (lruNode && lruNode !== this.head) {
                    this._remove(lruNode);
                    this.map.delete(lruNode.key);
                    this.evictions++;
                }
            }

            const newNode = new CacheNode(key, value, expiresAt);
            this.map.set(key, newNode);
            this._addToFront(newNode);
        }

        delete(key) {
            const node = this.map.get(key);
            if (node) {
                this._remove(node);
                this.map.delete(key);
                return true;
            }
            return false;
        }

        clear() {
            this.map.clear();
            this.head.next = this.tail;
            this.tail.prev = this.head;
            this.hits = 0;
            this.misses = 0;
            this.evictions = 0;
            this.expirations = 0;
        }

        size() {
            return this.map.size;
        }

        getStats() {
            const total = this.hits + this.misses;
            const hitRate = total > 0 ? ((this.hits / total) * 100).toFixed(1) : '0.0';
            return {
                capacity: this.capacity,
                size: this.map.size,
                hits: this.hits,
                misses: this.misses,
                evictions: this.evictions,
                expirations: this.expirations,
                hitRatePct: parseFloat(hitRate),
                ttlSeconds: Math.round(this.defaultTTLMs / 1000)
            };
        }
    }

    window.LRUCacheWithTTL = LRUCacheWithTTL;
    window.clientLRUCache = new LRUCacheWithTTL(100, 300000); // 5-minute TTL
})(window);
