"""Allowed disease labels for each plant in dataset v1.3."""

from __future__ import annotations


PLANT_TO_DISEASES: dict[str, frozenset[str]] = {
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
