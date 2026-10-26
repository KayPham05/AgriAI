# AGRI-122 — Knowledge/medicine API integration matrix

Integration with AGRI-130 test inventory: 22 new method/route pairs, 59 controller routes overall on base e1197ce. Existing AGRI-130 acceptance evidence remains historical. Stable ApiCase traits map to HTTP assertions in KnowledgeMedicineTests; the repository-only eligibility theory remains untagged.

| Method | Route | Behavioral cases |
| --- | --- | --- |
| GET | `/api/plants` | catalog.soft_delete; knowledge.catalog_visibility |
| GET | `/api/plants/{id:guid}` | catalog.create_and_read; catalog.missing_id; catalog.soft_delete; knowledge.catalog_visibility |
| POST | `/api/plants` | catalog.create_and_read; catalog.create_empty_name; catalog.create_name_boundary; catalog.write_authorization; existing.SecurityAuthorizationTests.CatalogWrites_ShouldRejectGuestAndRegularUser; catalog.plant_duplicate; existing.SecurityAuthorizationTests.AdminCatalogWrite_ShouldWork_WithTokenIssuedAfterRoleAssignment; catalog.optional_field_boundaries; knowledge.catalog_visibility |
| PUT | `/api/plants/{id:guid}` | catalog.update; catalog.update_invalid_name; catalog.missing_id; catalog.write_authorization; catalog.duplicate_update; catalog.optional_field_boundaries; knowledge.catalog_visibility |
| DELETE | `/api/plants/{id:guid}` | catalog.soft_delete; catalog.missing_id; catalog.write_authorization; knowledge.catalog_visibility |
| GET | `/api/diseases` | catalog.soft_delete; knowledge.catalog_visibility |
| GET | `/api/diseases/{id:guid}` | catalog.create_and_read; catalog.missing_id; catalog.soft_delete; knowledge.catalog_visibility |
| POST | `/api/diseases` | catalog.create_and_read; catalog.create_empty_name; catalog.create_name_boundary; catalog.write_authorization; existing.SecurityAuthorizationTests.CatalogWrites_ShouldRejectGuestAndRegularUser; catalog.disease_duplicate; catalog.optional_field_boundaries; knowledge.catalog_visibility |
| PUT | `/api/diseases/{id:guid}` | catalog.update; catalog.update_invalid_name; catalog.missing_id; catalog.write_authorization; catalog.optional_field_boundaries; catalog.duplicate_update; knowledge.catalog_visibility |
| DELETE | `/api/diseases/{id:guid}` | catalog.soft_delete; catalog.missing_id; catalog.write_authorization; knowledge.catalog_visibility |
| POST | `/api/predictions` | predictions.server.request_limit; predictions.server.timeout; existing.GuestPredictionsControllerTests.Prediction_ShouldRejectInvalidCredentials_InsteadOfRunningAsGuest; existing.GuestPredictionsControllerTests.GuestPrediction_ShouldReturnFullResult_WithoutStorageOrChangesToUserHistory; existing.GuestPredictionsControllerTests.InvalidGuestUpload_ShouldFailBeforeInferenceOrStorage; existing.GuestPredictionsControllerTests.GuestAiFailure_ShouldNotReturnSuccessOrPersistData; existing.GuestPredictionsControllerTests.GuestMappingMismatch_ShouldNotPersistData; existing.PredictionsControllerTests.CreatePrediction_ShouldReturnCreatedAndPersistPrediction_WhenImageIsValid; existing.PredictionsControllerTests.GuestPrediction_ShouldNotCreatePersonalHistory; existing.PredictionsControllerTests.CreatePrediction_ShouldReturnBadRequest_WhenFileExtensionIsInvalid; existing.PredictionsControllerTests.CreatePrediction_ShouldReturn503_WhenAiIsUnavailable; existing.AgriculturalProfilesControllerTests.Diagnosis_CanSelectOwnedProfile_AndDeletionPreservesHistorySnapshotAndImages; existing.AgriculturalProfilesControllerTests.Diagnosis_RejectsForeignOrMissingProfile_WithoutPersisting; existing.AgriculturalProfilesControllerTests.Guest_CannotSelectProfileForDiagnosis; existing.StorageSecurityTests.GuestBudget_RejectsSecondRequest_WithRetryAfter; existing.StorageSecurityTests.ConcurrencyBudget_RejectsNinthInference_AndReleasesPermits; existing.StorageSecurityTests.Quota_RejectsSecondStoredImage_WithoutLeavingPendingUpload; predictions.invalid_multipart; predictions.multipart_section_limit; predictions.image_formats_contract; predictions.dependency_failure_no_persistence; predictions.rate_same_user_sessions; predictions.unexpected_error_redaction; predictions.exact_upload_limit; knowledge.prediction_snapshot |
| GET | `/api/predictions/{id:guid}` | existing.PredictionsControllerTests.StoredSnapshot_ShouldSurviveCatalogChangesAndExpiry_AndRequireOwner; existing.SecurityAuthorizationTests.ProtectedEndpoints_ShouldRejectInvalidBearer; predictions.admin_delete_without_read; predictions.missing_object; knowledge.prediction_snapshot |
| GET | `/api/admin/medicines` | knowledge.lifecycle; knowledge.authorization |
| GET | `/api/admin/medicines/{id:guid}` | knowledge.lifecycle; knowledge.authorization; knowledge.validation |
| POST | `/api/admin/medicines` | knowledge.lifecycle; knowledge.authorization; knowledge.validation |
| PUT | `/api/admin/medicines/{id:guid}` | knowledge.lifecycle; knowledge.authorization |
| PUT | `/api/admin/medicines/{id:guid}/publication` | knowledge.lifecycle; knowledge.authorization |
| DELETE | `/api/admin/medicines/{id:guid}` | knowledge.lifecycle; knowledge.authorization |
| GET | `/api/medicines` | knowledge.lifecycle; knowledge.validation |
| GET | `/api/medicines/{id:guid}` | knowledge.lifecycle |
| GET | `/api/admin/knowledge-documents` | knowledge.lifecycle; knowledge.authorization |
| GET | `/api/admin/knowledge-documents/{id:guid}` | knowledge.lifecycle; knowledge.authorization; knowledge.validation |
| POST | `/api/admin/knowledge-documents` | knowledge.lifecycle; knowledge.authorization; knowledge.validation |
| PUT | `/api/admin/knowledge-documents/{id:guid}` | knowledge.lifecycle; knowledge.authorization; knowledge.document_links; knowledge.document_atomicity |
| PUT | `/api/admin/knowledge-documents/{id:guid}/publication` | knowledge.lifecycle; knowledge.authorization |
| DELETE | `/api/admin/knowledge-documents/{id:guid}` | knowledge.lifecycle; knowledge.authorization |
| GET | `/api/knowledge-documents` | knowledge.lifecycle; knowledge.validation |
| GET | `/api/knowledge-documents/{id:guid}` | knowledge.lifecycle |
| PUT | `/api/admin/medicines/{id:guid}/uses/{plantDiseaseId:guid}` | knowledge.authorization; knowledge.relations; knowledge.label_review |
| DELETE | `/api/admin/medicines/{id:guid}/uses/{plantDiseaseId:guid}` | knowledge.authorization; knowledge.relations |
| PUT | `/api/admin/diseases/{id:guid}/approval` | knowledge.disease_approval |
| GET | `/api/plant-diseases` | knowledge.pair_availability |
| GET | `/api/admin/plant-diseases` | knowledge.pair_availability |
| PUT | `/api/admin/plant-diseases/{id:guid}/availability` | knowledge.pair_availability |

Source: `backend/tests/AgriVision.ApiTests/Contracts/api_manifest.json`. Runtime and mapping guards validate this inventory; test execution results are recorded separately in [knowledge_medicine.md](knowledge_medicine.md).
