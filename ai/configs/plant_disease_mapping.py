"""Allowed disease labels for each plant by dataset version."""

from __future__ import annotations

from ai.configs import config

PLANT_TO_DISEASES_V1_3: dict[str, frozenset[str]] = {
    "Ca_chua": frozenset(
        {
            "Chay_la_som",
            "Dom_la_Septoria",
            "Dom_muc_tieu",
            "Dom_vi_khuan",
            "Khoe_manh",
            "Moc_la",
            "Moc_suong",
            "Nhen_do",
            "Virus_kham_la",
            "Virus_xoan_vang_la",
        }
    ),
    "Ca_phe": frozenset(
        {
            "Dom_chay_phoma",
            "Dom_la_cercospora",
            "Gi_sat",
            "Khoe_manh",
            "Sau_duc_la",
        }
    ),
    "Cam": frozenset(
        {
            "Khoe_manh",
            "Loet_vi_khuan",
            "Mac_nhieu_benh_cung_luc",
            "Vang_la_thieu_dinh_duong",
        }
    ),
    "Che": frozenset(
        {
            "Chay_la_nau",
            "Dom_la_do",
            "Dom_tao",
            "Khoe_manh",
            "Than_thu",
        }
    ),
    "Lua": frozenset(
        {
            "Bac_la_lua",
            "Chay_la",
            "Dom_nau",
            "Dom_than_la",
            "Khoe_manh",
            "Sau_gai_an_la",
            "Thoi_chop_la",
            "Vang_lui",
        }
    ),
    "Ngo": frozenset({"Chay_la", "Dom_la_xam", "Gi_sat", "Khoe_manh"}),
    "Nho": frozenset({"Chay_la", "Esca", "Khoe_manh", "Thoi_den"}),
    "Ot": frozenset(
        {"Dom_la", "Khoe_manh", "Ruoi_trang", "Vang_la", "Xoan_la"}
    ),
    "Sau_rieng": frozenset(
        {"Chay_la", "Dom_la_phomopsis", "Dom_tao", "Khoe_manh", "Ray_gay_hai"}
    ),
    "Xoai": frozenset(
        {
            "bo_cat_la",
            "bo_hong",
            "bo_xit",
            "kho_canh",
            "khoe_manh",
            "loet_vi_khuan",
            "phan_trang",
            "than_thu",
        }
    ),
}

PLANT_TO_DISEASES_V1_4: dict[str, frozenset[str]] = {
    **PLANT_TO_DISEASES_V1_3,
    "Ot": frozenset(
        {
            "Dom_la_cercospora",
            "Dom_vi_khuan",
            "Khoe_manh",
            "Phan_trang",
            "Thieu_dinh_duong",
            "Virus_xoan_la",
        }
    ),
}


def get_plant_to_diseases(dataset_version: str) -> dict[str, frozenset[str]]:
    if dataset_version == "v1.3":
        return PLANT_TO_DISEASES_V1_3
    if dataset_version == "v1.4":
        return PLANT_TO_DISEASES_V1_4
    raise ValueError(f"Chưa có bảng cây-bệnh cho dataset {dataset_version}")


PLANT_TO_DISEASES = get_plant_to_diseases(config.DATASET_VERSION)
