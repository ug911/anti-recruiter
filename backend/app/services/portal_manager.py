from app.automation.portals.mock_portal import MockPortal
from app.automation.portals.linkedin import LinkedInPortal
from app.automation.portals.naukri import NaukriPortal
from app.automation.portals.indeed import IndeedPortal
from app.automation.base import BasePortal
from typing import Dict, Type

class PortalManager:
    _portals: Dict[str, Type[BasePortal]] = {}

    @classmethod
    def register_portal(cls, portal_cls: Type[BasePortal]):
        cls._portals[portal_cls.name] = portal_cls

    @classmethod
    def get_portal(cls, name: str) -> BasePortal:
        portal_cls = cls._portals.get(name)
        if not portal_cls:
            raise ValueError(f"Portal {name} not found")
        return portal_cls()

    @classmethod
    def list_portals(cls):
        return list(cls._portals.keys())

# Register plugins
PortalManager.register_portal(MockPortal)
PortalManager.register_portal(LinkedInPortal)
PortalManager.register_portal(NaukriPortal)
PortalManager.register_portal(IndeedPortal)
