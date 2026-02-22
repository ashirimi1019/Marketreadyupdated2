"""Recruiter Truth-Link public profile and shareable link generation."""
from __future__ import annotations

import secrets
import string
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user_id
from app.api.routes.mri import compute_mri_components
from app.models.entities import (
    CareerPathway,
    ChecklistItem,
    ChecklistVersion,
    Proof,
    StudentAccount,
    StudentProfile,
    UserPathway,
)
from app.schemas.api import AgentReadyProfileOut

router = APIRouter()


def _generate_slug(length: int = 10) -> str:
    alphabet = string.ascii_lowercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def _resolve_subject(db: Session, slug: str) -> tuple[str, str, StudentProfile | None]:
    profile = db.query(StudentProfile).filter(StudentProfile.share_slug == slug).first()
    if profile:
        account = db.query(StudentAccount).filter(StudentAccount.username == profile.user_id).first()
        username = account.username if account else profile.user_id
        return profile.user_id, username, profile

    account = db.query(StudentAccount).filter(StudentAccount.username == slug).first()
    if account:
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == account.username).one_or_none()
        return account.username, account.username, profile

    raise HTTPException(status_code=404, detail="Profile not found")


def _get_verified_skills(db: Session, user_id: str) -> list[str]:
    selection = db.query(UserPathway).filter(UserPathway.user_id == user_id).one_or_none()
    if not selection:
        return []

    version_id = selection.checklist_version_id
    if not version_id:
        version = (
            db.query(ChecklistVersion)
            .filter(ChecklistVersion.pathway_id == selection.pathway_id)
            .filter(ChecklistVersion.status == "published")
            .order_by(ChecklistVersion.version_number.desc())
            .first()
        )
        if not version:
            return []
        version_id = version.id

    items = db.query(ChecklistItem).filter(ChecklistItem.version_id == version_id).all()
    proofs = db.query(Proof).filter(Proof.user_id == user_id).all()
    verified_ids = {str(p.checklist_item_id) for p in proofs if p.status == "verified"}
    return [item.title for item in items if str(item.id) in verified_ids]


def _get_public_profile_data(db: Session, user_id: str, username: str) -> dict[str, Any]:
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == user_id).one_or_none()
    selection = db.query(UserPathway).filter(UserPathway.user_id == user_id).one_or_none()

    pathway_name = None
    if selection:
        pathway = db.query(CareerPathway).filter(CareerPathway.id == selection.pathway_id).first()
        if pathway:
            pathway_name = pathway.name

    mri_data = compute_mri_components(db, user_id)
    verified_skills = _get_verified_skills(db, user_id)

    proofs = db.query(Proof).filter(Proof.user_id == user_id, Proof.status == "verified").all()
    proof_count = len(proofs)

    github_username = profile.github_username if profile else None

    return {
        "username": username,
        "university": profile.university if profile else None,
        "pathway": pathway_name,
        "mri_score": mri_data.get("score", 0.0),
        "mri_band": mri_data.get("band", "Not Started"),
        "mri_components": mri_data.get("components", {}),
        "verified_skills": verified_skills[:20],
        "proof_count": proof_count,
        "github_username": github_username,
        "github_audit_url": f"https://github.com/{github_username}" if github_username else None,
        "semester": profile.semester if profile else None,
        "profile_generated_at": datetime.utcnow().isoformat(),
    }


def _get_verified_assets(db: Session, user_id: str) -> list[dict[str, Any]]:
    proofs = (
        db.query(Proof)
        .filter(Proof.user_id == user_id, Proof.status == "verified")
        .order_by(Proof.created_at.desc())
        .limit(60)
        .all()
    )
    if not proofs:
        return []

    item_ids = [proof.checklist_item_id for proof in proofs]
    item_map: dict[str, str] = {}
    if item_ids:
        items = db.query(ChecklistItem).filter(ChecklistItem.id.in_(item_ids)).all()
        item_map = {str(item.id): item.title for item in items}

    return [
        {
            "id": proof.id,
            "proof_type": proof.proof_type,
            "checklist_item_id": proof.checklist_item_id,
            "checklist_item_title": item_map.get(str(proof.checklist_item_id)),
            "url": proof.url,
            "created_at": proof.created_at,
            "verification_status": "verified",
        }
        for proof in proofs
    ]


@router.post("/profile/generate-share-link")
def generate_share_link(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == user_id).one_or_none()
    if not profile:
        profile = StudentProfile(
            user_id=user_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(profile)

    if not profile.share_slug:
        for _ in range(10):
            slug = _generate_slug()
            existing = db.query(StudentProfile).filter(StudentProfile.share_slug == slug).first()
            if not existing:
                profile.share_slug = slug
                break
        else:
            raise HTTPException(status_code=500, detail="Could not generate unique share link")

    profile.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(profile)

    account = db.query(StudentAccount).filter(StudentAccount.username == user_id).first()
    username = account.username if account else user_id

    from app.core.config import settings

    share_url = f"{settings.public_app_base_url}/profile/{profile.share_slug}"
    return {
        "share_slug": profile.share_slug,
        "share_url": share_url,
        "username": username,
    }


@router.get("/public/{slug}")
def get_public_profile(slug: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    user_id, username, _ = _resolve_subject(db, slug)
    return _get_public_profile_data(db, user_id, username)


@router.get("/public/{slug}/agent-ready", response_model=AgentReadyProfileOut)
def get_agent_ready_profile(slug: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    user_id, username, profile = _resolve_subject(db, slug)
    public_data = _get_public_profile_data(db, user_id, username)
    verified_assets = _get_verified_assets(db, user_id)

    from app.core.config import settings

    share_slug = profile.share_slug if profile and profile.share_slug else None
    human_slug = share_slug or username
    human_profile_url = f"{settings.public_app_base_url}/profile/{human_slug}"
    api_profile_url = f"/public/{human_slug}/agent-ready"

    return {
        "schema_version": "agent_ready.v1",
        "generated_at": datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
        "username": username,
        "share_slug": share_slug,
        "mri_score": float(public_data.get("mri_score") or 0.0),
        "mri_band": str(public_data.get("mri_band") or "Not Started"),
        "mri_components": public_data.get("mri_components")
        if isinstance(public_data.get("mri_components"), dict)
        else {},
        "verified_skill_count": len(public_data.get("verified_skills") or []),
        "verified_assets": verified_assets,
        "links": {
            "human_profile": human_profile_url,
            "agent_api": api_profile_url,
        },
        "citations": [
            {
                "source": "Market Ready MRI engine",
                "signal": "mri_score",
                "value": round(float(public_data.get("mri_score") or 0.0), 2),
            },
            {
                "source": "Proof verification workflow",
                "signal": "verified_assets",
                "value": len(verified_assets),
            },
        ],
    }
