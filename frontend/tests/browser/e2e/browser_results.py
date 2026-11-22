"""Per-test outcomes shared by the browser and live runners."""

import unittest


class StructuredResult(unittest.TextTestResult):
    def __init__(self, stream, descriptions, verbosity, id_map: dict[str, str]):
        super().__init__(stream, descriptions, verbosity)
        self.id_map = id_map
        self.records: list[dict[str, str]] = []

    def addSuccess(self, test) -> None:
        super().addSuccess(test)
        self.records.append({"id": self.id_map.get(test.id(), test.id()), "test": test.id(), "status": "Passed"})

    def addFailure(self, test, err) -> None:
        super().addFailure(test, err)
        self.records.append({"id": self.id_map.get(test.id(), test.id()), "test": test.id(), "status": "Failed", "detail": self._exc_info_to_string(err, test)})

    def addError(self, test, err) -> None:
        super().addError(test, err)
        self.records.append({"id": self.id_map.get(test.id(), test.id()), "test": test.id(), "status": "Failed", "detail": self._exc_info_to_string(err, test)})

    def addSkip(self, test, reason) -> None:
        super().addSkip(test, reason)
        self.records.append({"id": self.id_map.get(test.id(), test.id()), "test": test.id(), "status": "Skipped", "detail": reason})
