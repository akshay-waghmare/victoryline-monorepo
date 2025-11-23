"""
Adapter Registry.
Manages available source adapters.
"""

from typing import Dict, List, Optional, Type
from .base import SourceAdapter
from .crex_adapter import CrexAdapter

class AdapterRegistry:
    """
    Registry for source adapters.
    """

    def __init__(self):
        self._adapters: Dict[str, SourceAdapter] = {}
        self._enabled_status: Dict[str, bool] = {}
        self._register_defaults()

    def _register_defaults(self):
        self.register(CrexAdapter())

    def register(self, adapter: SourceAdapter):
        """Register a new adapter."""
        self._adapters[adapter.domain] = adapter
        self._enabled_status[adapter.domain] = True

    def set_enabled(self, domain: str, enabled: bool):
        """Enable or disable an adapter."""
        if domain in self._adapters:
            self._enabled_status[domain] = enabled

    def is_enabled(self, domain: str) -> bool:
        """Check if an adapter is enabled."""
        return self._enabled_status.get(domain, False)

    def get_adapter(self, domain: str) -> Optional[SourceAdapter]:
        """Get adapter by domain name if enabled."""
        if self.is_enabled(domain):
            return self._adapters.get(domain)
        return None

    def get_all_adapters(self) -> Dict[str, SourceAdapter]:
        """Get all registered adapters."""
        return self._adapters.copy()

    def resolve_conflict(self, match_id: str, available_sources: List[str]) -> Optional[str]:
        """
        Determine which source should be authoritative for a match.
        Returns the domain name of the winner.
        """
        # Static priority list (can be made dynamic/config-based later)
        priority_order = ["crex", "espn"]
        
        for domain in priority_order:
            if domain in available_sources:
                return domain
        
        # Fallback to first available if none in priority list
        return available_sources[0] if available_sources else None
